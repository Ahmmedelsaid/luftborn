/**
 * Pure task derivations, composed by the store inside `computed()` signals.
 *
 * Overdue state is always recomputed from `dueDate` — never read from the wire
 * `isOverdue` flag, which is frozen at fixture-generation time.
 */

import {
  DueDateState,
  LiveTaskTotals,
  Task,
  TaskPriority,
  TaskStatus,
  TaskView,
  TASK_PRIORITY_WEIGHT,
  TASK_STATUSES,
  User,
  UserWorkload,
} from '../models';
import {
  differenceInCalendarDays,
  formatCompletedLabel,
  formatDueLabel,
  parseApiDate,
} from './date.utils';

/** Days ahead that still count as "due soon" and get the amber treatment. */
const DUE_SOON_THRESHOLD_DAYS = 2;

/** Whether a task is overdue right now. Completed tasks never are. */
export function isTaskOverdue(task: Task, now: Date): boolean {
  if (task.status === 'done') {
    return false;
  }
  return differenceInCalendarDays(parseApiDate(task.dueDate), now) < 0;
}

/** Picks which of the four due-date treatments a task should render. */
export function resolveDueState(task: Task, daysUntilDue: number): DueDateState {
  if (task.status === 'done') {
    return 'completed';
  }

  if (daysUntilDue < 0) {
    return 'overdue';
  }

  return daysUntilDue <= DUE_SOON_THRESHOLD_DAYS ? 'due-soon' : 'upcoming';
}

/**
 * Projects a wire task into the shape templates bind to. `index` backfills
 * `order` for fixtures that carry no ordering field.
 */
export function toTaskView(task: Task, now: Date, index = 0): TaskView {
  const daysUntilDue = differenceInCalendarDays(parseApiDate(task.dueDate), now);
  const dueState = resolveDueState(task, daysUntilDue);

  const dueLabel =
    dueState === 'completed' && task.completedAt
      ? formatCompletedLabel(task.completedAt, now)
      : formatDueLabel(daysUntilDue);

  return {
    ...task,
    overdue: dueState === 'overdue',
    dueState,
    dueLabel,
    daysUntilDue,
    order: task.order ?? index,
  };
}

/** Filter state the board and task list are driven by. Empty arrays mean "all". */
export interface TaskFilters {
  readonly search: string;
  readonly statuses: readonly TaskStatus[];
  readonly priorities: readonly TaskPriority[];
  readonly assigneeIds: readonly string[];
  readonly overdueOnly: boolean;
}

/** Neutral filter state; nothing filtered out. */
export const EMPTY_TASK_FILTERS: TaskFilters = {
  search: '',
  statuses: [],
  priorities: [],
  assigneeIds: [],
  overdueOnly: false,
};

export function hasActiveFilters(filters: TaskFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.assigneeIds.length > 0 ||
    filters.overdueOnly
  );
}

/** Matches title, description, tags and assignee name — everything on the card. */
function matchesSearch(task: TaskView, needle: string): boolean {
  if (!needle) {
    return true;
  }

  return (
    task.title.toLowerCase().includes(needle) ||
    task.description.toLowerCase().includes(needle) ||
    task.assignee.name.toLowerCase().includes(needle) ||
    task.tags.some((tag) => tag.toLowerCase().includes(needle))
  );
}

export function filterTasks(tasks: readonly TaskView[], filters: TaskFilters): TaskView[] {
  const needle = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(task.status)) {
      return false;
    }

    if (filters.priorities.length > 0 && !filters.priorities.includes(task.priority)) {
      return false;
    }

    if (filters.assigneeIds.length > 0 && !filters.assigneeIds.includes(task.assignee.id)) {
      return false;
    }

    if (filters.overdueOnly && !task.overdue) {
      return false;
    }

    return matchesSearch(task, needle);
  });
}

export type TaskSortKey = 'manual' | 'dueDate' | 'priority' | 'title' | 'updatedAt';

/**
 * Sorts a column of tasks. `manual` honours the drag-and-drop `order`; every
 * other key falls back to `order` as a tiebreaker so the sort is total and
 * equal-ranked tasks never swap places between renders.
 */
export function sortTasks(tasks: readonly TaskView[], key: TaskSortKey): TaskView[] {
  const byOrder = (a: TaskView, b: TaskView): number => a.order - b.order;

  return [...tasks].sort((a, b) => {
    switch (key) {
      case 'dueDate':
        return a.dueDate.localeCompare(b.dueDate) || byOrder(a, b);
      case 'priority':
        return TASK_PRIORITY_WEIGHT[b.priority] - TASK_PRIORITY_WEIGHT[a.priority] || byOrder(a, b);
      case 'title':
        return a.title.localeCompare(b.title) || byOrder(a, b);
      case 'updatedAt':
        return b.updatedAt.localeCompare(a.updatedAt) || byOrder(a, b);
      case 'manual':
      default:
        return byOrder(a, b);
    }
  });
}

/** Buckets tasks by status, always returning every column in canonical order. */
export function groupTasksByStatus(
  tasks: readonly TaskView[],
): Readonly<Record<TaskStatus, TaskView[]>> {
  const groups = Object.fromEntries(
    TASK_STATUSES.map((status) => [status, [] as TaskView[]]),
  ) as Record<TaskStatus, TaskView[]>;

  for (const task of tasks) {
    groups[task.status].push(task);
  }

  return groups;
}

/** Counts derived from the tasks loaded in the client. */
export function computeTaskTotals(tasks: readonly TaskView[]): LiveTaskTotals {
  let todo = 0;
  let inProgress = 0;
  let done = 0;
  let overdue = 0;
  let highPriority = 0;
  let mediumPriority = 0;
  let lowPriority = 0;

  for (const task of tasks) {
    if (task.status === 'todo') {
      todo += 1;
    } else if (task.status === 'in_progress') {
      inProgress += 1;
    } else {
      done += 1;
    }

    if (task.overdue) {
      overdue += 1;
    }

    if (task.priority === 'high') {
      highPriority += 1;
    } else if (task.priority === 'medium') {
      mediumPriority += 1;
    } else {
      lowPriority += 1;
    }
  }

  return {
    total: tasks.length,
    todo,
    inProgress,
    done,
    overdue,
    highPriority,
    mediumPriority,
    lowPriority,
  };
}

/** Joins users with their current workload, busiest first. */
export function computeUserWorkloads(
  users: readonly User[],
  tasks: readonly TaskView[],
): UserWorkload[] {
  return users
    .map((user) => {
      const assigned = tasks.filter((task) => task.assignee.id === user.id);
      const doneTasks = assigned.filter((task) => task.status === 'done').length;

      return {
        ...user,
        totalTasks: assigned.length,
        todoTasks: assigned.filter((task) => task.status === 'todo').length,
        inProgressTasks: assigned.filter((task) => task.status === 'in_progress').length,
        doneTasks,
        overdueTasks: assigned.filter((task) => task.overdue).length,
        completionRate: assigned.length === 0 ? 0 : Math.round((doneTasks / assigned.length) * 100),
      };
    })
    .sort((a, b) => b.totalTasks - a.totalTasks || a.name.localeCompare(b.name));
}
