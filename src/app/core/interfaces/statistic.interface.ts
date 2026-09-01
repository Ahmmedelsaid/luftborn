export type ChangeType = 'positive' | 'negative' | 'neutral';

/**
 * A statistic card from `GET /api/statistics`.
 *
 * The fixture describes a 156-task organisation while `/api/tasks` returns a
 * 17-task working set, so the cards show the API's own aggregates. Anything that
 * must agree with what is on screen uses {@link LiveTaskTotals} instead.
 */
export interface Statistic {
  readonly id: string;
  readonly title: string;
  /** Emoji from the fixture, rendered as-is: it is what the design shows. */
  readonly icon: string;
  readonly value: number;
  readonly change: string;
  readonly changeLabel: string;
  readonly changeType: ChangeType;
  readonly color: string;
}

export interface StatisticsFixture {
  readonly statistics: readonly Statistic[];
  readonly lastUpdated: string;
}

/** Counts computed from the tasks loaded in the client. */
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
