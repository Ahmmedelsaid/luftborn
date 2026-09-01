/**
 * A ticking clock exposed as a signal.
 *
 * Overdue state is derived from "now", so a dashboard left open across midnight
 * would otherwise keep showing yesterday's labels. Exposing the current time as
 * a signal makes every dependent `computed()` — overdue counts, due-date labels,
 * relative timestamps — re-evaluate on its own.
 */

import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval, map } from 'rxjs';
import { CLOCK } from '../utils/date.utils';

/**
 * One minute. Fine-grained enough for "3 minutes ago" in the activity feed, and
 * coarse enough that the cost is irrelevant.
 */
const TICK_INTERVAL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class ClockService {
  private readonly clock = inject(CLOCK);

  /** The current time, refreshed every minute. */
  readonly now = toSignal(interval(TICK_INTERVAL_MS).pipe(map(() => this.clock())), {
    initialValue: this.clock(),
  });

  /** A one-off reading, for imperative code that must not create a dependency. */
  snapshot(): Date {
    return this.clock();
  }
}
