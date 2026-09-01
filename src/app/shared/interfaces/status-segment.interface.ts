import { TaskStatus } from '../../core/interfaces';

/** One entry in the status segmented control. `null` is the "All" segment. */
export interface StatusSegment {
  readonly value: TaskStatus | null;
  /** Translation key, so the control carries no English. */
  readonly labelKey: string;
}
