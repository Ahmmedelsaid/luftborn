import { HttpTestingController, TestRequest } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createTask,
  createTaskPerStatus,
  dateOffsetFromNow,
  TEST_NOW,
} from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { Task, TaskDraft } from '../models';
import { TaskStore } from './task-store';

/** Body shape `TestRequest.flush` accepts. */
type FlushBody = Parameters<TestRequest['flush']>[0];

/** `TaskStore` pulls in `ActivityStore`, so both initial requests are answered. */
async function setupStore(tasks: Task[]): Promise<TaskStore> {
  const store = TestBed.inject(TaskStore);
  await settle();

  const backend = httpBackend();
  backend.match((request) => request.url.endsWith('/tasks')).forEach((req) => req.flush(tasks));
  backend.match((request) => request.url.endsWith('/activities')).forEach((req) => req.flush([]));

  await settle();
  return store;
}

/** The single pending request whose url ends with `suffix`. */
function pendingRequest(suffix: string): TestRequest {
  const matches = httpBackend().match((request) => request.url.endsWith(suffix));

  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one pending request ending in "${suffix}", found ${matches.length}`,
    );
  }

  return matches[0];
}

/**
 * The activity `POST` is fire-and-forget in the store, so it only exists once
 * the task write has resolved — draining it earlier would leave it open.
 */
async function completeMutation<T>(
  pending: Promise<T>,
  suffix: string,
  body: FlushBody,
  status?: number,
): Promise<T> {
  const request = pendingRequest(suffix);

  if (status !== undefined && status >= 400) {
    request.flush(body, { status, statusText: 'Error' });
  } else {
    request.flush(body);
  }

  const result = await pending;

  httpBackend()
    .match((request_) => request_.url.endsWith('/activities') && request_.method === 'POST')
    .forEach((request_) => request_.flush({ id: 'activity-new' }));

  await settle();
  return result;
}

describe('TaskStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestHttpWithErrorNormalisation(), provideFrozenClock()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  describe('loading', () => {
    it('exposes the loaded collection', async () => {
      const store = await setupStore([createTask({ id: 'task-001' })]);

      expect(store.tasks()).toHaveLength(1);
      expect(store.tasks()[0].id).toBe('task-001');
      expect(store.isLoading()).toBe(false);
    });

    it('projects every task into a view model with derived due state', async () => {
      const store = await setupStore([
        createTask({ id: 'overdue', status: 'todo', dueDate: dateOffsetFromNow(-2) }),
      ]);

      expect(store.tasks()[0].overdue).toBe(true);
      expect(store.tasks()[0].dueLabel).toBe('Overdue by 2 days');
    });

    it('surfaces a normalised load error', async () => {
      const store = TestBed.inject(TaskStore);
      await settle();

      pendingRequest('/tasks').flush('down', { status: 503, statusText: 'Unavailable' });
      httpBackend()
        .match((request) => request.url.endsWith('/activities'))
        .forEach((request) => request.flush([]));
      await settle();

      expect(store.loadError()?.kind).toBe('server');
      expect(store.loadError()?.retryable).toBe(true);
    });
  });

  describe('derived state', () => {
    it('groups tasks into the three board columns in canonical order', async () => {
      const store = await setupStore(createTaskPerStatus());

      expect(store.board().map((column) => column.status)).toEqual(['todo', 'in_progress', 'done']);
      expect(store.board().every((column) => column.count === 1)).toBe(true);
    });

    it('counts statuses, priorities and overdue tasks', async () => {
      const store = await setupStore([
        createTask({ id: 'a', status: 'todo', priority: 'high', dueDate: dateOffsetFromNow(-1) }),
        createTask({ id: 'b', status: 'in_progress', priority: 'low' }),
      ]);

      expect(store.totals()).toMatchObject({
        total: 2,
        todo: 1,
        inProgress: 1,
        overdue: 1,
        highPriority: 1,
        lowPriority: 1,
      });
    });

    it('collects the distinct tag set, sorted', async () => {
      const store = await setupStore([
        createTask({ id: 'a', tags: ['Design', 'Frontend'] }),
        createTask({ id: 'b', tags: ['Backend', 'Design'] }),
      ]);

      expect(store.allTags()).toEqual(['Backend', 'Design', 'Frontend']);
    });

    it('looks a task up by id', async () => {
      const store = await setupStore([createTask({ id: 'task-042' })]);

      expect(store.taskById('task-042')?.id).toBe('task-042');
      expect(store.taskById('nope')).toBeUndefined();
    });
  });

  describe('filtering', () => {
    it('narrows the board without touching the unfiltered totals', async () => {
      const store = await setupStore(createTaskPerStatus());

      store.setStatusFilter('todo');

      expect(store.filteredTasks()).toHaveLength(1);
      expect(store.totals().total).toBe(3);
      expect(store.filteredTotals().total).toBe(1);
    });

    it('reports the board count from the filtered set', async () => {
      const store = await setupStore(createTaskPerStatus());

      store.setSearch('nothing matches this');

      expect(store.board().every((column) => column.count === 0)).toBe(true);
    });

    it('clears the status filter when passed null', async () => {
      const store = await setupStore(createTaskPerStatus());

      store.setStatusFilter('done');
      store.setStatusFilter(null);

      expect(store.filteredTasks()).toHaveLength(3);
      expect(store.hasActiveFilters()).toBe(false);
    });

    it('resets every filter at once', async () => {
      const store = await setupStore(createTaskPerStatus());

      store.patchFilters({ search: 'design', priorities: ['high'], overdueOnly: true });
      expect(store.hasActiveFilters()).toBe(true);

      store.resetFilters();

      expect(store.hasActiveFilters()).toBe(false);
      expect(store.filteredTasks()).toHaveLength(3);
    });

    it('applies the sort key within each column', async () => {
      const store = await setupStore([
        createTask({ id: 'later', status: 'todo', dueDate: dateOffsetFromNow(9), order: 0 }),
        createTask({ id: 'sooner', status: 'todo', dueDate: dateOffsetFromNow(1), order: 10 }),
      ]);

      store.setSortKey('dueDate');

      expect(store.board()[0].tasks.map((task) => task.id)).toEqual(['sooner', 'later']);
    });
  });

  describe('create', () => {
    const draft: TaskDraft = {
      title: 'Write the README',
      description: 'Document the architecture decisions',
      status: 'todo',
      priority: 'medium',
      dueDate: dateOffsetFromNow(3),
      assignee: createTask().assignee,
      tags: ['Documentation'],
    };

    it('shows the task immediately and reconciles with the server response', async () => {
      const store = await setupStore([]);

      const pending = store.create(draft);
      expect(store.tasks()).toHaveLength(1);
      const optimisticId = store.tasks()[0].id;

      const created = await completeMutation(pending, '/tasks', {
        ...createTask({ id: 'task-server', title: draft.title }),
      });

      expect(created?.id).toBe('task-server');
      expect(store.tasks()).toHaveLength(1);
      expect(store.tasks()[0].id).toBe('task-server');
      expect(optimisticId).not.toBe('task-server');
    });

    it('rolls the optimistic insert back when the write fails', async () => {
      const store = await setupStore([]);

      const pending = store.create(draft);
      expect(store.tasks()).toHaveLength(1);

      expect(await completeMutation(pending, '/tasks', 'nope', 500)).toBeNull();
      expect(store.tasks()).toHaveLength(0);
      expect(store.mutationError()?.kind).toBe('server');
    });

    it('stamps completedAt when a task is created straight into Done', async () => {
      const store = await setupStore([]);

      const pending = store.create({ ...draft, status: 'done' });
      const optimistic = store.tasks()[0];

      expect(optimistic.completedAt).toBe(TEST_NOW.toISOString());

      await completeMutation(pending, '/tasks', { ...createTask({ id: optimistic.id }) });
    });

    it('places a new task after the existing ones in its column', async () => {
      const store = await setupStore([createTask({ id: 'a', status: 'todo', order: 5000 })]);

      const pending = store.create(draft);
      const created = store.tasks().find((task) => task.id !== 'a');

      expect(created?.order).toBeGreaterThan(5000);

      await completeMutation(pending, '/tasks', { ...createTask({ id: created?.id ?? 'x' }) });
    });
  });

  describe('update', () => {
    it('applies the patch immediately and keeps the server response', async () => {
      const store = await setupStore([createTask({ id: 'task-001', title: 'Before' })]);

      const pending = store.update('task-001', { title: 'After' });
      expect(store.taskById('task-001')?.title).toBe('After');

      const ok = await completeMutation(pending, '/tasks/task-001', {
        ...createTask({ id: 'task-001', title: 'After' }),
      });

      expect(ok).toBe(true);
      expect(store.taskById('task-001')?.title).toBe('After');
    });

    it('restores the previous task when the write fails', async () => {
      const store = await setupStore([createTask({ id: 'task-001', title: 'Before' })]);

      const pending = store.update('task-001', { title: 'After' });
      const ok = await completeMutation(pending, '/tasks/task-001', 'nope', 500);

      expect(ok).toBe(false);
      expect(store.taskById('task-001')?.title).toBe('Before');
    });

    it('stamps completedAt when moving a task to Done', async () => {
      const store = await setupStore([createTask({ id: 'task-001', status: 'todo' })]);

      const pending = store.update('task-001', { status: 'done' });

      expect(store.taskById('task-001')?.completedAt).toBe(TEST_NOW.toISOString());

      await completeMutation(pending, '/tasks/task-001', {
        ...createTask({ id: 'task-001', status: 'done' }),
      });
    });

    it('clears completedAt when moving a task back out of Done', async () => {
      const store = await setupStore([
        createTask({ id: 'task-001', status: 'done', completedAt: TEST_NOW.toISOString() }),
      ]);

      const pending = store.update('task-001', { status: 'todo' });

      expect(store.taskById('task-001')?.completedAt).toBeUndefined();

      await completeMutation(pending, '/tasks/task-001', {
        ...createTask({ id: 'task-001', status: 'todo' }),
      });
    });

    it('marks the task pending while the write is in flight', async () => {
      const store = await setupStore([createTask({ id: 'task-001' })]);

      const pending = store.update('task-001', { title: 'x' });
      expect(store.isPending('task-001')).toBe(true);

      await completeMutation(pending, '/tasks/task-001', { ...createTask({ id: 'task-001' }) });

      expect(store.isPending('task-001')).toBe(false);
    });

    it('is a no-op for an unknown id', async () => {
      const store = await setupStore([]);

      expect(await store.update('nope', { title: 'x' })).toBe(false);
    });
  });

  describe('remove', () => {
    it('removes the task immediately and confirms on success', async () => {
      const store = await setupStore([createTask({ id: 'task-001' })]);

      const pending = store.remove('task-001');
      expect(store.tasks()).toHaveLength(0);

      expect(await completeMutation(pending, '/tasks/task-001', null)).toBe(true);
      expect(store.tasks()).toHaveLength(0);
    });

    it('puts the task back when the delete fails', async () => {
      const store = await setupStore([createTask({ id: 'task-001' })]);

      const pending = store.remove('task-001');
      const ok = await completeMutation(pending, '/tasks/task-001', 'nope', 500);

      expect(ok).toBe(false);
      expect(store.taskById('task-001')).toBeDefined();
      expect(store.mutationError()).not.toBeNull();
    });

    it('is a no-op for an unknown id', async () => {
      const store = await setupStore([]);

      expect(await store.remove('nope')).toBe(false);
    });
  });

  describe('move', () => {
    it('changes status and order in a single request', async () => {
      const store = await setupStore([
        createTask({ id: 'a', status: 'todo', order: 1000 }),
        createTask({ id: 'b', status: 'in_progress', order: 1000 }),
      ]);

      const pending = store.move('a', 'in_progress', 1);
      expect(store.taskById('a')?.status).toBe('in_progress');

      const request = pendingRequest('/tasks/a');
      expect(request.request.body).toMatchObject({ status: 'in_progress' });
      request.flush({ ...createTask({ id: 'a', status: 'in_progress' }) });

      await pending;
      httpBackend()
        .match((req) => req.method === 'POST')
        .forEach((req) => req.flush({ id: 'activity-new' }));
      await settle();
    });

    it('reorders within a column without touching the status', async () => {
      const store = await setupStore([
        createTask({ id: 'a', status: 'todo', order: 1000 }),
        createTask({ id: 'b', status: 'todo', order: 2000 }),
      ]);

      const pending = store.move('a', 'todo', 1);

      const request = pendingRequest('/tasks/a');
      expect(request.request.body).not.toHaveProperty('status');
      expect(request.request.body).toHaveProperty('order');
      request.flush({ ...createTask({ id: 'a', order: 3000 }) });

      await pending;
      httpBackend()
        .match((req) => req.method === 'POST')
        .forEach((req) => req.flush({ id: 'activity-new' }));
      await settle();
    });

    it('lands between its new neighbours so siblings are untouched', async () => {
      const store = await setupStore([
        createTask({ id: 'a', status: 'todo', order: 1000 }),
        createTask({ id: 'b', status: 'todo', order: 2000 }),
        createTask({ id: 'c', status: 'todo', order: 3000 }),
      ]);

      const pending = store.move('c', 'todo', 1);

      const request = pendingRequest('/tasks/c');
      expect(request.request.body).toMatchObject({ order: 1500 });
      request.flush({ ...createTask({ id: 'c', order: 1500 }) });

      await pending;
      httpBackend()
        .match((req) => req.method === 'POST')
        .forEach((req) => req.flush({ id: 'activity-new' }));
      await settle();
    });

    it('is a no-op for an unknown id', async () => {
      const store = await setupStore([]);

      expect(await store.move('nope', 'done', 0)).toBe(false);
    });
  });

  describe('error handling', () => {
    it('clears the mutation error on dismiss', async () => {
      const store = await setupStore([createTask({ id: 'task-001' })]);

      const pending = store.remove('task-001');
      await completeMutation(pending, '/tasks/task-001', 'nope', 500);

      expect(store.mutationError()).not.toBeNull();

      store.dismissError();

      expect(store.mutationError()).toBeNull();
    });
  });
});
