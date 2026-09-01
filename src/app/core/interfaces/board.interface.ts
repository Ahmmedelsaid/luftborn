import { TaskStatus, TaskView } from './task.interface';

/** One kanban column, as produced by the task store. */
export interface BoardColumn {
  readonly status: TaskStatus;
  readonly tasks: readonly TaskView[];
  readonly count: number;
}
