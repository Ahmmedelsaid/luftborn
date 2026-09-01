/**
 * Test data factories.
 *
 * Every factory takes an override object so a spec states only the fields it
 * actually cares about. That keeps the assertion visible instead of buried in
 * twenty lines of scaffolding, and adding a field to a model does not break
 * every existing spec.
 */

import { Activity, Statistic, Task, TaskAssignee, TaskStatus, User } from '../app/core/models';
import { toApiDateString } from '../app/core/utils/date.utils';

/** Fixed reference date used by the specs, so nothing depends on the real clock. */
export const TEST_NOW = new Date(2026, 8, 1, 12, 0, 0);

/** Returns a `YYYY-MM-DD` string offset from {@link TEST_NOW} by whole days. */
export function dateOffsetFromNow(days: number): string {
  const date = new Date(TEST_NOW);
  date.setDate(date.getDate() + days);
  return toApiDateString(date);
}

export function createAssignee(overrides: Partial<TaskAssignee> = {}): TaskAssignee {
  return {
    id: 'user-001',
    name: 'John Doe',
    avatar: 'JD',
    email: 'john.doe@company.com',
    ...overrides,
  };
}

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-001',
    name: 'John Doe',
    avatar: 'JD',
    email: 'john.doe@company.com',
    color: '#1976D2',
    ...overrides,
  };
}

export function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-001',
    title: 'Design new homepage layout',
    description: 'Create wireframes and mockups for the new homepage redesign',
    status: 'todo',
    priority: 'high',
    dueDate: dateOffsetFromNow(2),
    assignee: createAssignee(),
    tags: ['Design'],
    createdAt: new Date(2026, 7, 30).toISOString(),
    updatedAt: TEST_NOW.toISOString(),
    order: 0,
    ...overrides,
  };
}

/** Builds `count` tasks with unique ids and increasing `order`. */
export function createTasks(count: number, overrides: Partial<Task> = {}): Task[] {
  return Array.from({ length: count }, (_, index) =>
    createTask({
      id: `task-${String(index + 1).padStart(3, '0')}`,
      order: index * 1000,
      ...overrides,
    }),
  );
}

/** One task per status, useful for grouping and totals assertions. */
export function createTaskPerStatus(): Task[] {
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];

  return statuses.map((status, index) =>
    createTask({
      id: `task-${status}`,
      status,
      order: index * 1000,
      ...(status === 'done' ? { completedAt: TEST_NOW.toISOString() } : {}),
    }),
  );
}

export function createActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-001',
    type: 'updated',
    taskId: 'task-001',
    taskTitle: 'Design new homepage layout',
    userId: 'user-001',
    userName: 'John Doe',
    userAvatar: 'JD',
    message: 'updated "Design new homepage layout"',
    timestamp: TEST_NOW.toISOString(),
    ...overrides,
  };
}

export function createStatistic(overrides: Partial<Statistic> = {}): Statistic {
  return {
    id: 'stat-001',
    title: 'Total Tasks',
    icon: '📊',
    value: 156,
    change: '+12',
    changeLabel: 'this week',
    changeType: 'positive',
    color: '#1976D2',
    ...overrides,
  };
}
