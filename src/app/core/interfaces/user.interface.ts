/** A team member, from `GET /api/users`. */
export interface User {
  readonly id: string;
  readonly name: string;
  /** Pre-computed initials, e.g. `"JD"`. */
  readonly avatar: string;
  readonly email: string;
  readonly color: string;
}

/** A user plus task counts derived from current board state. */
export interface UserWorkload extends User {
  readonly totalTasks: number;
  readonly todoTasks: number;
  readonly inProgressTasks: number;
  readonly doneTasks: number;
  readonly overdueTasks: number;
  /** Percentage of assigned tasks that are done, `0`–`100`. */
  readonly completionRate: number;
}
