/**
 * Dashboard statistic-card model, served verbatim from `GET /api/statistics`.
 *
 * The fixture describes a 156-task organisation while `/api/tasks` returns a
 * 17-task working set. The cards therefore render the API's own aggregate
 * figures; anything that has to agree with what is on screen uses
 * {@link LiveTaskTotals} instead.
 */

export type ChangeType = 'positive' | 'negative' | 'neutral';

export interface Statistic {
  readonly id: string;
  readonly title: string;
  /** Emoji shipped by the fixture, rendered decoratively. */
  readonly icon: string;
  readonly value: number;
  /** Signed delta as a display string, e.g. `"+12"`. */
  readonly change: string;
  /** Period the delta refers to, e.g. `"this week"`. */
  readonly changeLabel: string;
  readonly changeType: ChangeType;
  /** Per-card accent colour supplied by the fixture. */
  readonly color: string;
}

/** Envelope used by `data-fetching/statistics.json`. */
export interface StatisticsFixture {
  readonly statistics: readonly Statistic[];
  readonly lastUpdated: string;
}

/** Counts computed from the tasks actually loaded in the client. */
export interface LiveTaskTotals {
  readonly total: number;
  readonly todo: number;
  readonly inProgress: number;
  readonly done: number;
  readonly overdue: number;
  readonly highPriority: number;
  readonly mediumPriority: number;
  readonly lowPriority: number;
}
