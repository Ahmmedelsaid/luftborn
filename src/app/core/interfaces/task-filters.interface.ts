import { TaskPriority, TaskStatus } from './task.interface';

/** Filter state for the board and task list. Empty arrays mean "all". */
export interface TaskFilters {
  readonly search: string;
  readonly statuses: readonly TaskStatus[];
  readonly priorities: readonly TaskPriority[];
  readonly assigneeIds: readonly string[];
  readonly overdueOnly: boolean;
}

export type TaskSortKey = 'manual' | 'dueDate' | 'priority' | 'title' | 'updatedAt';
