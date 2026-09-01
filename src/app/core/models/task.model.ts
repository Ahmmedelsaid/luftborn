/**
 * Task domain model.
 *
 * `Task` is the wire shape returned by `GET /api/tasks`. Anything the UI needs
 * but the API does not send is derived in `core/utils/task.utils.ts` and exposed
 * through {@link TaskView}.
 */

/** Board column a task belongs to. Matches the API's snake_case values. */
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type TaskPriority = 'low' | 'medium' | 'high';

/** Column order used by the board and the status filter. */
export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'done',
] as const satisfies readonly TaskStatus[];

/** Priority order, most urgent first. */
export const TASK_PRIORITIES = ['high', 'medium', 'low'] as const satisfies readonly TaskPriority[];

export const TASK_STATUS_LABELS: Readonly<Record<TaskStatus, string>> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  done: 'Done',
};

export const TASK_PRIORITY_LABELS: Readonly<Record<TaskPriority, string>> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

/** Sort weight for priority; higher sorts first. */
export const TASK_PRIORITY_WEIGHT: Readonly<Record<TaskPriority, number>> = {
  high: 3,
  medium: 2,
  low: 1,
};

/** The user a task is assigned to, embedded in the task payload. */
export interface TaskAssignee {
  readonly id: string;
  readonly name: string;
  /** Pre-computed initials used as the avatar label, e.g. `"JD"`. */
  readonly avatar: string;
  readonly email: string;
}

export interface Task {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly priority: TaskPriority;
  /** Calendar date, `YYYY-MM-DD`. */
  readonly dueDate: string;
  /**
   * Frozen at fixture-generation time and present on only some tasks. Never
   * read directly — use `isTaskOverdue()`.
   */
  readonly isOverdue?: boolean;
  /** ISO timestamp, present on `done` tasks. */
  readonly completedAt?: string;
  readonly assignee: TaskAssignee;
  readonly tags: readonly string[];
  readonly createdAt: string;
  readonly updatedAt: string;
  /**
   * Manual position within a board column, maintained by drag-and-drop. Absent
   * on the seeded fixtures, where the store backfills it from the array index.
   */
  readonly order?: number;
}

/** Payload for `POST /api/tasks`; the API assigns `id` and timestamps. */
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

/** Envelope used by `data-fetching/tasks.json`. */
export interface TasksFixture {
  readonly tasks: readonly Task[];
  readonly meta: {
    readonly totalCount: number;
    readonly lastUpdated: string;
  };
}

/** Which of the four due-date treatments in the design a task should render. */
export type DueDateState = 'overdue' | 'due-soon' | 'upcoming' | 'completed';

/** A task plus the presentation-only fields derived from it. */
export interface TaskView extends Task {
  /** Recomputed from `dueDate` against the current date, not the wire flag. */
  readonly overdue: boolean;
  readonly dueState: DueDateState;
  /** Ready-to-render label, e.g. `"Overdue by 2 days"`. */
  readonly dueLabel: string;
  /** Whole days until the due date; negative when overdue. */
  readonly daysUntilDue: number;
  readonly order: number;
}
