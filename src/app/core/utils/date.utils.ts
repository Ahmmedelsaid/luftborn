/**
 * Calendar-date helpers.
 *
 * All functions are pure and take `now` explicitly, so derived task state is
 * testable without mocking global `Date`. The app supplies the real clock
 * through {@link CLOCK}.
 */

import { InjectionToken } from '@angular/core';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The application clock. Overridable in specs to freeze time. */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  factory: () => (): Date => new Date(),
});

/** Returns a new `Date` at local midnight of the given date. */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Parses an API date.
 *
 * A bare `YYYY-MM-DD` is parsed as UTC midnight by `new Date()`, which lands on
 * the previous day anywhere west of Greenwich and throws off every "days until
 * due" calculation. Splitting the components builds a local date instead. Full
 * ISO timestamps carry an offset and are passed through unchanged.
 */
export function parseApiDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

/** Formats a date as the `YYYY-MM-DD` string the API expects. */
export function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole calendar days from `from` to `to`; negative when `to` is in the past.
 * Both operands are normalised to local midnight so the result counts date
 * boundaries rather than 24-hour spans.
 */
export function differenceInCalendarDays(to: Date, from: Date): number {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(diff / MS_PER_DAY);
}

function plural(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

/** Renders the due-date line on a task card, matching the design's phrasing. */
export function formatDueLabel(daysUntilDue: number): string {
  if (daysUntilDue < 0) {
    return `Overdue by ${plural(Math.abs(daysUntilDue), 'day')}`;
  }

  if (daysUntilDue === 0) {
    return 'Due today';
  }

  if (daysUntilDue === 1) {
    return 'Due tomorrow';
  }

  if (daysUntilDue === 7) {
    return 'Due in 1 week';
  }

  return `Due in ${plural(daysUntilDue, 'day')}`;
}

/** Renders the completion line on `done` cards, e.g. `"Completed today"`. */
export function formatCompletedLabel(completedAt: string, now: Date): string {
  const completed = parseApiDate(completedAt);
  const days = differenceInCalendarDays(now, completed);

  if (days <= 0) {
    return 'Completed today';
  }

  if (days === 1) {
    return 'Completed yesterday';
  }

  if (days < 7) {
    return `Completed ${plural(days, 'day')} ago`;
  }

  return `Completed on ${completed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

/**
 * Coarse relative timestamp for the activity feed. Hand-rolled rather than using
 * `Intl.RelativeTimeFormat`, which renders "1 day ago" where the design shows
 * "yesterday".
 */
export function formatRelativeTime(timestamp: string, now: Date): string {
  const parsed = new Date(timestamp);
  const elapsedMinutes = Math.floor((now.getTime() - parsed.getTime()) / 60_000);

  if (elapsedMinutes < 1) {
    return 'just now';
  }

  if (elapsedMinutes < 60) {
    return `${plural(elapsedMinutes, 'minute')} ago`;
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return `${plural(elapsedHours, 'hour')} ago`;
  }

  const elapsedDays = differenceInCalendarDays(now, parsed);

  if (elapsedDays === 1) {
    return 'yesterday';
  }

  if (elapsedDays < 7) {
    return `${plural(elapsedDays, 'day')} ago`;
  }

  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
