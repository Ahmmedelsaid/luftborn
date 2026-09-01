import { LocalisedLabel } from './i18n.interface';

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'done',
] as const satisfies readonly TaskStatus[];

export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const satisfies readonly TaskPriority[];

/** Translation keys, so no English leaks out of the domain layer. */
export const TASK_STATUS_LABEL_KEYS: Readonly<Record<TaskStatus, string>> = {
  todo: 'status.todo',
  in_progress: 'status.in_progress',
  done: 'status.done',
};

export const TASK_PRIORITY_LABEL_KEYS: Readonly<Record<TaskPriority, string>> = {
  high: 'priority.high',
  medium: 'priority.medium',
  low: 'priority.low',
};

/** Sort weight for priority; higher sorts first. */
export const TASK_PRIORITY_WEIGHT: Readonly<Record<TaskPriority, number>> = {
  high: 3,
  medium: 2,
  low: 1,
};

export interface TaskAssignee {
  readonly id: string;
  readonly name: string;
  /** Pre-computed initials, e.g. `"JD"`. */
  readonly avatar: string;
  readonly email: string;
}

/** A task as returned by `GET /api/tasks`. */
export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  /** Calendar date, `YYYY-MM-DD`. */
  readonly dueDate: string;
  /**
   * Frozen at fixture-generation time and present on only some tasks. Never read
   * directly — use `isTaskOverdue()`.
   */
  readonly isOverdue?: boolean;
  readonly completedAt?: string;
  readonly assignee: TaskAssignee;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /** Manual board position. Absent on the fixtures; backfilled from the index. */
  readonly order?: number;
}

/** Payload for `POST /api/tasks`. */
export interface TaskDraft {
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  readonly dueDate: string;
  readonly assignee: TaskAssignee;
  readonly tags: readonly string[];
}

/** Payload for `PATCH /api/tasks/:id`. */
export type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt'>>;

export interface TasksFixture {
  readonly tasks: readonly Task[];
  readonly meta: {
    readonly totalCount: number;
    readonly lastUpdated: string;
  };
}

export type DueDateState = 'overdue' | 'due-soon' | 'upcoming' | 'completed';

/** A task plus the presentation fields derived from it by `toTaskView()`. */
export interface TaskView extends Task {
  /** Recomputed from `dueDate`, not read from the wire flag. */
  readonly overdue: boolean;
  readonly dueState: DueDateState;
  /** e.g. `"Overdue by 2 days"`. */
  /** Translation key plus params; the view layer renders it. */
  readonly dueLabel: LocalisedLabel;
  /** Negative when overdue. */
  readonly daysUntilDue: number;
  readonly order: number;
}
