import { FormArray, FormControl } from '@angular/forms';
import { TaskPriority, TaskStatus } from '../../../core/interfaces';

/** Shape of the reactive task form, so the template cannot drift from it. */
export interface TaskFormShape {
  title: FormControl<string>;
  description: FormControl<string>;
  status: FormControl<TaskStatus>;
  priority: FormControl<TaskPriority>;
  dueDate: FormControl<Date | null>;
  assigneeId: FormControl<string>;
  tags: FormArray<FormControl<string>>;
}

export interface TaskFormDialogData {
  /** Task to edit; absent when composing a new one. */
  readonly taskId?: string;
}

/** What the dialog resolves with, so the caller knows whether anything changed. */
export type TaskFormDialogResult = 'saved' | 'cancelled';
