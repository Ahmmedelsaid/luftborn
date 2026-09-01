import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { CLOCK } from '../utils/date.utils';

const TICK_INTERVAL_MS = 60_000;

/**
 * The current time as a signal, so overdue state and relative timestamps
 * re-derive on their own instead of going stale on a long-open dashboard.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly clock = inject(CLOCK);

  readonly now = toSignal(interval(TICK_INTERVAL_MS).pipe(map(() => this.clock())), {
    initialValue: this.clock(),
  });

  /** A one-off reading, for imperative code that must not create a dependency. */
  snapshot(): Date {
    return this.clock();
  }
}
