import { TaskStatus } from '../../core/interfaces';

/** A drag-and-drop drop, resolved to the values the store needs. */
export interface TaskMove {
  readonly taskId: string;
  readonly toStatus: TaskStatus;
  readonly toIndex: number;
}
