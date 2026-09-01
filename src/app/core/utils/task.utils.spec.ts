import { describe, expect, it } from 'vitest';
import {
  createTask,
  createTaskPerStatus,
  createTasks,
  createUser,
  dateOffsetFromNow,
  TEST_NOW,
} from '../../../testing/task.factory';
import { TaskView } from '../models';
import {
  computeTaskTotals,
  computeUserWorkloads,
  EMPTY_TASK_FILTERS,
  filterTasks,
  groupTasksByStatus,
  hasActiveFilters,
  isTaskOverdue,
  resolveDueState,
  sortTasks,
  toTaskView,
} from './task.utils';

/** Shorthand: project fixtures into view models against the frozen clock. */
function views(tasks: Parameters<typeof toTaskView>[0][]): TaskView[] {
  return tasks.map((task, index) => toTaskView(task, TEST_NOW, index));
}

describe('isTaskOverdue', () => {
  it('is true for an unfinished task past its due date', () => {
    const task = createTask({ status: 'todo', dueDate: dateOffsetFromNow(-1) });

    expect(isTaskOverdue(task, TEST_NOW)).toBe(true);
  });

  it('is false on the due date itself', () => {
    const task = createTask({ status: 'todo', dueDate: dateOffsetFromNow(0) });

    expect(isTaskOverdue(task, TEST_NOW)).toBe(false);
  });

  it('is false for a completed task, however late', () => {
    const task = createTask({ status: 'done', dueDate: dateOffsetFromNow(-30) });

    expect(isTaskOverdue(task, TEST_NOW)).toBe(false);
  });

  it('ignores the stale isOverdue flag from the fixtures', () => {
    // The fixture claims overdue but the date says otherwise; the date wins.
    const task = createTask({ status: 'todo', dueDate: dateOffsetFromNow(5), isOverdue: true });

    expect(isTaskOverdue(task, TEST_NOW)).toBe(false);
  });
});

describe('resolveDueState', () => {
  it.each([
    [-1, 'todo', 'overdue'],
    [0, 'todo', 'due-soon'],
    [2, 'todo', 'due-soon'],
    [3, 'todo', 'upcoming'],
    [-5, 'done', 'completed'],
  ] as const)('maps %i days on a %s task to %s', (days, status, expected) => {
    const task = createTask({ status, dueDate: dateOffsetFromNow(days) });

    expect(resolveDueState(task, days)).toBe(expected);
  });
});

describe('toTaskView', () => {
  it('derives the overdue flag, state and label together', () => {
    const view = toTaskView(
      createTask({ status: 'todo', dueDate: dateOffsetFromNow(-2) }),
      TEST_NOW,
    );

    expect(view.overdue).toBe(true);
    expect(view.dueState).toBe('overdue');
    expect(view.dueLabel).toBe('Overdue by 2 days');
    expect(view.daysUntilDue).toBe(-2);
  });

  it('shows the completion label instead of a due label on done tasks', () => {
    const view = toTaskView(
      createTask({
        status: 'done',
        dueDate: dateOffsetFromNow(-3),
        completedAt: TEST_NOW.toISOString(),
      }),
      TEST_NOW,
    );

    expect(view.dueState).toBe('completed');
    expect(view.dueLabel).toBe('Completed today');
  });

  it('backfills order from the index when the API omits it', () => {
    const task = createTask();
    const withoutOrder = { ...task, order: undefined };

    expect(toTaskView(withoutOrder, TEST_NOW, 7).order).toBe(7);
  });

  it('prefers an explicit order over the index', () => {
    expect(toTaskView(createTask({ order: 4000 }), TEST_NOW, 7).order).toBe(4000);
  });
});

describe('hasActiveFilters', () => {
  it('is false for the neutral state', () => {
    expect(hasActiveFilters(EMPTY_TASK_FILTERS)).toBe(false);
  });

  it('ignores a whitespace-only search', () => {
    expect(hasActiveFilters({ ...EMPTY_TASK_FILTERS, search: '   ' })).toBe(false);
  });

  it.each([
    ['search', { search: 'design' }],
    ['statuses', { statuses: ['todo' as const] }],
    ['priorities', { priorities: ['high' as const] }],
    ['assignees', { assigneeIds: ['user-001'] }],
    ['overdueOnly', { overdueOnly: true }],
  ])('is true when %s is set', (_label, patch) => {
    expect(hasActiveFilters({ ...EMPTY_TASK_FILTERS, ...patch })).toBe(true);
  });
});

describe('filterTasks', () => {
  const tasks = views([
    createTask({
      id: 'a',
      title: 'Design new homepage',
      description: 'Wireframes',
      status: 'todo',
      priority: 'high',
      tags: ['Design'],
    }),
    createTask({
      id: 'b',
      title: 'Optimize database queries',
      description: 'Performance audit follow-up',
      status: 'in_progress',
      priority: 'medium',
      tags: ['Performance'],
      assignee: { id: 'user-002', name: 'Sarah Smith', avatar: 'SS', email: 's@c.com' },
    }),
    createTask({
      id: 'c',
      title: 'Prepare budget report',
      description: 'Finance data',
      status: 'todo',
      priority: 'high',
      dueDate: dateOffsetFromNow(-4),
      tags: ['Finance'],
    }),
  ]);

  it('returns everything for the neutral filter', () => {
    expect(filterTasks(tasks, EMPTY_TASK_FILTERS)).toHaveLength(3);
  });

  it('matches the search against the title', () => {
    const result = filterTasks(tasks, { ...EMPTY_TASK_FILTERS, search: 'homepage' });

    expect(result.map((task) => task.id)).toEqual(['a']);
  });

  it('matches the search against the description', () => {
    const result = filterTasks(tasks, { ...EMPTY_TASK_FILTERS, search: 'audit' });

    expect(result.map((task) => task.id)).toEqual(['b']);
  });

  it('matches the search against tags and assignee name', () => {
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, search: 'finance' })).toHaveLength(1);
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, search: 'sarah' })).toHaveLength(1);
  });

  it('is case-insensitive and trims the query', () => {
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, search: '  HOMEPAGE ' })).toHaveLength(1);
  });

  it('filters by status', () => {
    const result = filterTasks(tasks, { ...EMPTY_TASK_FILTERS, statuses: ['todo'] });

    expect(result.map((task) => task.id)).toEqual(['a', 'c']);
  });

  it('filters by priority', () => {
    const result = filterTasks(tasks, { ...EMPTY_TASK_FILTERS, priorities: ['medium'] });

    expect(result.map((task) => task.id)).toEqual(['b']);
  });

  it('filters by assignee', () => {
    const result = filterTasks(tasks, { ...EMPTY_TASK_FILTERS, assigneeIds: ['user-002'] });

    expect(result.map((task) => task.id)).toEqual(['b']);
  });

  it('filters to overdue tasks only', () => {
    const result = filterTasks(tasks, { ...EMPTY_TASK_FILTERS, overdueOnly: true });

    expect(result.map((task) => task.id)).toEqual(['c']);
  });

  it('combines filters conjunctively', () => {
    const result = filterTasks(tasks, {
      ...EMPTY_TASK_FILTERS,
      statuses: ['todo'],
      priorities: ['high'],
      search: 'budget',
    });

    expect(result.map((task) => task.id)).toEqual(['c']);
  });

  it('returns an empty array when nothing matches', () => {
    expect(filterTasks(tasks, { ...EMPTY_TASK_FILTERS, search: 'nonexistent' })).toEqual([]);
  });
});

describe('sortTasks', () => {
  const tasks = views([
    createTask({
      id: 'a',
      title: 'Beta',
      priority: 'low',
      dueDate: dateOffsetFromNow(9),
      order: 30,
    }),
    createTask({
      id: 'b',
      title: 'Alpha',
      priority: 'high',
      dueDate: dateOffsetFromNow(1),
      order: 20,
    }),
    createTask({
      id: 'c',
      title: 'Gamma',
      priority: 'medium',
      dueDate: dateOffsetFromNow(4),
      order: 10,
    }),
  ]);

  it('honours the manual order by default', () => {
    expect(sortTasks(tasks, 'manual').map((task) => task.id)).toEqual(['c', 'b', 'a']);
  });

  it('sorts by due date ascending', () => {
    expect(sortTasks(tasks, 'dueDate').map((task) => task.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by priority, most urgent first', () => {
    expect(sortTasks(tasks, 'priority').map((task) => task.id)).toEqual(['b', 'c', 'a']);
  });

  it('sorts by title alphabetically', () => {
    expect(sortTasks(tasks, 'title').map((task) => task.id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties on order so the sort is deterministic', () => {
    const equalPriority = views([
      createTask({ id: 'x', priority: 'high', order: 200 }),
      createTask({ id: 'y', priority: 'high', order: 100 }),
    ]);

    expect(sortTasks(equalPriority, 'priority').map((task) => task.id)).toEqual(['y', 'x']);
  });

  it('does not mutate the input array', () => {
    const input = views([createTask({ id: 'p', order: 20 }), createTask({ id: 'q', order: 10 })]);
    const before = input.map((task) => task.id);

    sortTasks(input, 'manual');

    expect(input.map((task) => task.id)).toEqual(before);
  });
});

describe('groupTasksByStatus', () => {
  it('returns every column even when empty', () => {
    const groups = groupTasksByStatus([]);

    expect(Object.keys(groups)).toEqual(['todo', 'in_progress', 'done']);
    expect(groups.todo).toEqual([]);
  });

  it('buckets each task under its status', () => {
    const groups = groupTasksByStatus(views(createTaskPerStatus()));

    expect(groups.todo).toHaveLength(1);
    expect(groups.in_progress).toHaveLength(1);
    expect(groups.done).toHaveLength(1);
  });
});

describe('computeTaskTotals', () => {
  it('returns zeroes for an empty collection', () => {
    expect(computeTaskTotals([])).toEqual({
      total: 0,
      todo: 0,
      inProgress: 0,
      done: 0,
      overdue: 0,
      highPriority: 0,
      mediumPriority: 0,
      lowPriority: 0,
    });
  });

  it('counts statuses, priorities and overdue tasks', () => {
    const totals = computeTaskTotals(
      views([
        createTask({ id: 'a', status: 'todo', priority: 'high', dueDate: dateOffsetFromNow(-1) }),
        createTask({ id: 'b', status: 'in_progress', priority: 'medium' }),
        createTask({
          id: 'c',
          status: 'done',
          priority: 'low',
          completedAt: TEST_NOW.toISOString(),
        }),
      ]),
    );

    expect(totals).toEqual({
      total: 3,
      todo: 1,
      inProgress: 1,
      done: 1,
      overdue: 1,
      highPriority: 1,
      mediumPriority: 1,
      lowPriority: 1,
    });
  });

  it('counts the status buckets consistently with the total', () => {
    const totals = computeTaskTotals(views(createTasks(5)));

    expect(totals.todo + totals.inProgress + totals.done).toBe(totals.total);
  });
});

describe('computeUserWorkloads', () => {
  const alice = createUser({ id: 'user-001', name: 'Alice' });
  const bob = createUser({ id: 'user-002', name: 'Bob' });

  it('gives an unassigned user a zero workload and no division by zero', () => {
    const [workload] = computeUserWorkloads([alice], []);

    expect(workload.totalTasks).toBe(0);
    expect(workload.completionRate).toBe(0);
  });

  it('counts a user’s tasks by status and computes a completion rate', () => {
    const tasks = views([
      createTask({ id: 'a', status: 'done', assignee: { ...alice }, completedAt: '2026-09-01' }),
      createTask({ id: 'b', status: 'todo', assignee: { ...alice } }),
      createTask({ id: 'c', status: 'in_progress', assignee: { ...alice } }),
      createTask({
        id: 'd',
        status: 'todo',
        assignee: { ...alice },
        dueDate: dateOffsetFromNow(-2),
      }),
    ]);

    const [workload] = computeUserWorkloads([alice], tasks);

    expect(workload.totalTasks).toBe(4);
    expect(workload.doneTasks).toBe(1);
    expect(workload.todoTasks).toBe(2);
    expect(workload.inProgressTasks).toBe(1);
    expect(workload.overdueTasks).toBe(1);
    expect(workload.completionRate).toBe(25);
  });

  it('orders the busiest user first', () => {
    const tasks = views([
      createTask({ id: 'a', assignee: { ...bob } }),
      createTask({ id: 'b', assignee: { ...bob } }),
      createTask({ id: 'c', assignee: { ...alice } }),
    ]);

    expect(computeUserWorkloads([alice, bob], tasks).map((user) => user.name)).toEqual([
      'Bob',
      'Alice',
    ]);
  });

  it('falls back to alphabetical order on equal workloads', () => {
    expect(computeUserWorkloads([bob, alice], []).map((user) => user.name)).toEqual([
      'Alice',
      'Bob',
    ]);
  });
});
