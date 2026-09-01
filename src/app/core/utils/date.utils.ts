import { InjectionToken } from '@angular/core';
import { LocalisedLabel } from '../interfaces';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The application clock. Overridable in specs to freeze time. */
export const CLOCK = new InjectionToken<() => Date>('CLOCK', {
  factory: () => (): Date => new Date(),
});

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Parses an API date.
 *
 * A bare `YYYY-MM-DD` is parsed as UTC midnight by `new Date()`, which lands on
 * the previous day west of Greenwich and throws off every day count. Splitting
 * the components builds a local date instead. Full ISO timestamps pass through.
 */
export function parseApiDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
}

export function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Whole calendar days from `from` to `to`; negative when `to` is in the past.
 * Normalises to local midnight so it counts date boundaries, not 24-hour spans.
 */
export function differenceInCalendarDays(to: Date, from: Date): number {
  const diff = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.round(diff / MS_PER_DAY);
}

/**
 * The due-date line on a task card, as a key the view layer translates.
 *
 * Returning a key rather than a sentence keeps these functions free of any
 * language, and lets Arabic choose its own plural form.
 */
export function formatDueLabel(daysUntilDue: number): LocalisedLabel {
  if (daysUntilDue < 0) {
    const overdueBy = Math.abs(daysUntilDue);
    return { key: 'task.due.overdue', params: { count: overdueBy }, count: overdueBy };
  }

  if (daysUntilDue === 0) {
    return { key: 'task.due.today' };
  }

  if (daysUntilDue === 1) {
    return { key: 'task.due.tomorrow' };
  }

  if (daysUntilDue === 7) {
    return { key: 'task.due.inOneWeek' };
  }

  return { key: 'task.due.inDays', params: { count: daysUntilDue }, count: daysUntilDue };
}

/** The completion line on `done` cards, as a key the view layer translates. */
export function formatCompletedLabel(completedAt: string, now: Date): LocalisedLabel {
  const completed = parseApiDate(completedAt);
  const days = differenceInCalendarDays(now, completed);

  if (days <= 0) {
    return { key: 'task.completed.today' };
  }

  if (days === 1) {
    return { key: 'task.completed.yesterday' };
  }

  if (days < 7) {
    return { key: 'task.completed.daysAgo', params: { count: days }, count: days };
  }

  return { key: 'task.completed.onDate', params: { date: completed.toISOString() } };
}

/** Coarse relative timestamp for the activity feed, as a translation key. */
export function formatRelativeTime(timestamp: string, now: Date): LocalisedLabel {
  const parsed = new Date(timestamp);
  const elapsedMinutes = Math.floor((now.getTime() - parsed.getTime()) / 60_000);

  if (elapsedMinutes < 1) {
    return { key: 'time.justNow' };
  }

  if (elapsedMinutes < 60) {
    return { key: 'time.minutesAgo', params: { count: elapsedMinutes }, count: elapsedMinutes };
  }

  const elapsedHours = Math.floor(elapsedMinutes / 60);

  if (elapsedHours < 24) {
    return { key: 'time.hoursAgo', params: { count: elapsedHours }, count: elapsedHours };
  }

  const elapsedDays = differenceInCalendarDays(now, parsed);

  if (elapsedDays === 1) {
    return { key: 'time.yesterday' };
  }

  if (elapsedDays < 7) {
    return { key: 'time.daysAgo', params: { count: elapsedDays }, count: elapsedDays };
  }

  return { key: 'time.onDate', params: { date: parsed.toISOString() } };
}
