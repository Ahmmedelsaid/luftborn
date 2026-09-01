import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, text, texts } from '../../../../testing/component-helpers';
import { createTask, TEST_NOW } from '../../../../testing/task.factory';
import { BoardColumn, Task, TaskStatus, TaskView } from '../../../core/interfaces';

import { toTaskView } from '../../../core/utils/task.utils';
import { provideAppIcons } from '../../icons/provide-icons';
import { TaskBoard } from './task-board';

function view(overrides: Partial<Task> = {}): TaskView {
  return toTaskView(createTask(overrides), TEST_NOW);
}

function column(status: TaskStatus, tasks: TaskView[]): BoardColumn {
  return { status, tasks, count: tasks.length };
}

/** Three columns, populated from the given per-status task lists. */
function board(
  todo: TaskView[] = [],
  inProgress: TaskView[] = [],
  done: TaskView[] = [],
): BoardColumn[] {
  return [column('todo', todo), column('in_progress', inProgress), column('done', done)];
}

/** A drop event shaped like the one the CDK emits. */
function dropEvent(
  taskId: string,
  currentIndex: number,
  options: { sameContainer?: boolean; previousIndex?: number } = {},
): CdkDragDrop<TaskStatus> {
  const container = { id: 'a' };
  const previousContainer = options.sameContainer ? container : { id: 'b' };

  return {
    item: { data: taskId },
    container,
    previousContainer,
    currentIndex,
    previousIndex: options.previousIndex ?? 0,
  } as unknown as CdkDragDrop<TaskStatus>;
}

describe('TaskBoard', () => {
  let fixture: ComponentFixture<TaskBoard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TaskBoard],
      providers: [provideAppIcons()],
    });
    fixture = TestBed.createComponent(TaskBoard);
  });

  async function render(
    columns: BoardColumn[],
    extra?: { loading?: boolean; filtered?: boolean; pendingIds?: Set<string> },
  ): Promise<void> {
    fixture.componentRef.setInput('columns', columns);

    if (extra?.loading !== undefined) {
      fixture.componentRef.setInput('loading', extra.loading);
    }
    if (extra?.filtered !== undefined) {
      fixture.componentRef.setInput('filtered', extra.filtered);
    }
    if (extra?.pendingIds) {
      fixture.componentRef.setInput('pendingIds', extra.pendingIds);
    }

    await fixture.whenStable();
  }

  describe('rendering', () => {
    it('renders one column per status, in canonical order', async () => {
      await render(board([view({ id: 'a' })], [view({ id: 'b' })], [view({ id: 'c' })]));

      expect(texts(fixture, '.board__title')).toEqual(['To Do', 'In Progress', 'Done']);
    });

    it('shows each column count', async () => {
      await render(board([view({ id: 'a' }), view({ id: 'b' })], [], []));

      expect(texts(fixture, '.board__count')).toEqual(['2', '0', '0']);
    });

    it('renders a card per task', async () => {
      await render(board([view({ id: 'a' }), view({ id: 'b' })]));

      const host = fixture.nativeElement as HTMLElement;

      expect(host.querySelectorAll('app-task-card')).toHaveLength(2);
    });

    it('notes an empty column without claiming the board is empty', async () => {
      await render(board([view({ id: 'a' })], [], []));

      expect(texts(fixture, '.board__column-empty')).toEqual([
        'Nothing here yet',
        'Nothing here yet',
      ]);
    });
  });

  describe('loading and empty states', () => {
    it('shows skeleton placeholders while loading', async () => {
      await render(board(), { loading: true });

      const host = fixture.nativeElement as HTMLElement;

      expect(host.querySelectorAll('app-skeleton').length).toBeGreaterThan(0);
      expect(exists(fixture, 'app-empty-state')).toBe(false);
    });

    it('invites the first task when the board is genuinely empty', async () => {
      await render(board(), { filtered: false });

      expect(text(fixture, 'app-empty-state')).toContain('No tasks yet');
    });

    it('suggests clearing filters when nothing matched', async () => {
      await render(board(), { filtered: true });

      expect(text(fixture, 'app-empty-state')).toContain('No tasks match your filters');
    });

    it('emits createTask from the empty state', async () => {
      await render(board(), { filtered: false });

      const spy = vi.fn();
      fixture.componentInstance.createTask.subscribe(spy);

      await click(fixture, 'app-empty-state button');

      expect(spy).toHaveBeenCalled();
    });

    it('emits clearFilters from the filtered empty state', async () => {
      await render(board(), { filtered: true });

      const spy = vi.fn();
      fixture.componentInstance.clearFilters.subscribe(spy);

      await click(fixture, 'app-empty-state button');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('drag and drop', () => {
    it('emits a move when a card is dropped into another column', async () => {
      await render(board([view({ id: 'a' })]));

      const spy = vi.fn();
      fixture.componentInstance.taskMoved.subscribe(spy);

      fixture.componentInstance['onDrop'](dropEvent('a', 2), 'done');

      expect(spy).toHaveBeenCalledWith({ taskId: 'a', toStatus: 'done', toIndex: 2 });
    });

    it('emits a move when a card is reordered within its column', async () => {
      await render(board([view({ id: 'a' }), view({ id: 'b' })]));

      const spy = vi.fn();
      fixture.componentInstance.taskMoved.subscribe(spy);

      fixture.componentInstance['onDrop'](
        dropEvent('a', 1, { sameContainer: true, previousIndex: 0 }),
        'todo',
      );

      expect(spy).toHaveBeenCalledWith({ taskId: 'a', toStatus: 'todo', toIndex: 1 });
    });

    it('ignores a drop that lands a card back where it started', async () => {
      await render(board([view({ id: 'a' })]));

      const spy = vi.fn();
      fixture.componentInstance.taskMoved.subscribe(spy);

      fixture.componentInstance['onDrop'](
        dropEvent('a', 0, { sameContainer: true, previousIndex: 0 }),
        'todo',
      );

      expect(spy).not.toHaveBeenCalled();
    });

    it('connects every column, so a card can be dropped anywhere', async () => {
      await render(board([view({ id: 'a' })]));

      expect(fixture.componentInstance['dropListIds']()).toEqual([
        'board-column-todo',
        'board-column-in_progress',
        'board-column-done',
      ]);
    });
  });

  describe('move targets', () => {
    it.each([
      ['todo', ['in_progress', 'done']],
      ['in_progress', ['todo', 'done']],
      ['done', ['todo', 'in_progress']],
    ] as const)('offers every status but %s', async (status, expected) => {
      await render(board());

      expect(fixture.componentInstance['moveTargetsFor'](status)).toEqual(expected);
    });
  });
});
