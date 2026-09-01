/**
 * User (assignee) model, served by `GET /api/users`.
 *
 * Task counts are not part of the payload — they are derived state that would go
 * stale on the first mutation, so the Team view computes them from the tasks.
 */

export interface User {
  readonly id: string;
  readonly name: string;
  /** Pre-computed initials used as the avatar label, e.g. `"JD"`. */
  readonly avatar: string;
  readonly email: string;
  /** Stable avatar background colour assigned by the mock API. */
  readonly color: string;
}

/** A user plus the task counts derived from current board state. */
export interface UserWorkload extends User {
  readonly totalTasks: number;
  readonly todoTasks: number;
  readonly inProgressTasks: number;
  readonly doneTasks: number;
  readonly overdueTasks: number;
  /** Percentage of assigned tasks that are done, `0`–`100`. */
  readonly completionRate: number;
}
