import { TaskView } from '../../../core/interfaces';

/** One cell in the month grid. */
export interface CalendarDay {
  readonly date: Date;
  /** `YYYY-MM-DD`, used as the `@for` track key. */
  readonly key: string;
  readonly dayNumber: number;
  /** False for the leading and trailing days that pad the grid. */
  readonly inMonth: boolean;
  readonly isToday: boolean;
  readonly tasks: readonly TaskView[];
  readonly overdueCount: number;
}
