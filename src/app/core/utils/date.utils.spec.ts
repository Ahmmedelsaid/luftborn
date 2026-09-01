import { describe, expect, it } from 'vitest';
import {
  differenceInCalendarDays,
  formatCompletedLabel,
  formatDueLabel,
  formatRelativeTime,
  parseApiDate,
  startOfDay,
  toApiDateString,
} from './date.utils';

const NOW = new Date(2026, 8, 1, 12, 0, 0);

describe('startOfDay', () => {
  it('zeroes the time components without mutating the input', () => {
    const input = new Date(2026, 8, 1, 23, 59, 59, 999);
    const result = startOfDay(input);

    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
    expect(input.getHours()).toBe(23);
  });
});

describe('parseApiDate', () => {
  it('parses a bare calendar date in the local timezone', () => {
    const result = parseApiDate('2026-09-03');

    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(8);
    expect(result.getDate()).toBe(3);
  });

  it('does not shift the day, unlike the native UTC parse', () => {
    // `new Date('2026-09-03')` is UTC midnight, which is 3 September only for
    // offsets >= 0. This is the bug the manual parse exists to avoid.
    const parsed = parseApiDate('2026-09-03');
    const native = new Date('2026-09-03');

    expect(parsed.getDate()).toBe(3);
    expect(toApiDateString(parsed)).toBe('2026-09-03');

    if (native.getTimezoneOffset() > 0) {
      expect(native.getDate()).not.toBe(parsed.getDate());
    }
  });

  it('passes a full ISO timestamp through to the native parser', () => {
    const iso = '2026-09-01T10:30:00.000Z';

    expect(parseApiDate(iso).getTime()).toBe(new Date(iso).getTime());
  });
});

describe('toApiDateString', () => {
  it('zero-pads month and day', () => {
    expect(toApiDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('round-trips through parseApiDate', () => {
    expect(toApiDateString(parseApiDate('2026-12-31'))).toBe('2026-12-31');
  });
});

describe('differenceInCalendarDays', () => {
  it('counts date boundaries rather than 24-hour spans', () => {
    const lateEvening = new Date(2026, 8, 1, 23, 30);
    const nextMorning = new Date(2026, 8, 2, 1, 0);

    expect(differenceInCalendarDays(nextMorning, lateEvening)).toBe(1);
  });

  it('returns zero for two times on the same day', () => {
    expect(differenceInCalendarDays(new Date(2026, 8, 1, 23, 59), new Date(2026, 8, 1, 0, 1))).toBe(
      0,
    );
  });

  it('returns a negative value when the target is in the past', () => {
    expect(differenceInCalendarDays(new Date(2026, 7, 30), NOW)).toBe(-2);
  });

  it('is unaffected by a daylight-saving transition', () => {
    // Late March in most European zones. A naive millisecond division returns
    // 30.958… days here and rounds inconsistently; normalising to midnight does
    // not.
    const start = new Date(2026, 2, 1);
    const end = new Date(2026, 3, 1);

    expect(differenceInCalendarDays(end, start)).toBe(31);
  });
});

describe('formatDueLabel', () => {
  it.each([
    [-2, 'task.due.overdue', 2],
    [-1, 'task.due.overdue', 1],
    [5, 'task.due.inDays', 5],
  ])('maps %i days to %s with a count of %i', (days, key, count) => {
    expect(formatDueLabel(days)).toEqual({ key, params: { count }, count });
  });

  it.each([
    [0, 'task.due.today'],
    [1, 'task.due.tomorrow'],
    [7, 'task.due.inOneWeek'],
  ])('maps %i days to the fixed key %s', (days, key) => {
    expect(formatDueLabel(days)).toEqual({ key });
  });

  it('returns a key rather than English, so the utility carries no language', () => {
    expect(formatDueLabel(-3).key).not.toMatch(/[a-z] [a-z]/i);
  });
});

describe('formatCompletedLabel', () => {
  it('uses the same-day key for a completion today', () => {
    expect(formatCompletedLabel(new Date(2026, 8, 1, 9, 0).toISOString(), NOW)).toEqual({
      key: 'task.completed.today',
    });
  });

  it('uses the yesterday key for the previous day', () => {
    expect(formatCompletedLabel(new Date(2026, 7, 31, 9, 0).toISOString(), NOW)).toEqual({
      key: 'task.completed.yesterday',
    });
  });

  it('counts days within the last week', () => {
    expect(formatCompletedLabel(new Date(2026, 7, 29, 9, 0).toISOString(), NOW)).toEqual({
      key: 'task.completed.daysAgo',
      params: { count: 3 },
      count: 3,
    });
  });

  it('passes an ISO date through beyond a week, for the view to format', () => {
    const label = formatCompletedLabel(new Date(2026, 7, 10, 9, 0).toISOString(), NOW);

    expect(label.key).toBe('task.completed.onDate');
    expect(label.params?.['date']).toMatch(/^2026-08-10/);
  });
});

describe('formatRelativeTime', () => {
  it.each([
    [new Date(2026, 8, 1, 11, 59, 30), 'time.justNow'],
    [new Date(2026, 7, 31, 10, 0), 'time.yesterday'],
  ])('maps %s to the fixed key %s', (timestamp, key) => {
    expect(formatRelativeTime(timestamp.toISOString(), NOW)).toEqual({ key });
  });

  it.each([
    [new Date(2026, 8, 1, 11, 45), 'time.minutesAgo', 15],
    [new Date(2026, 8, 1, 11, 0), 'time.hoursAgo', 1],
    [new Date(2026, 8, 1, 4, 0), 'time.hoursAgo', 8],
    [new Date(2026, 7, 28, 10, 0), 'time.daysAgo', 4],
  ])('maps %s to %s with a count of %i', (timestamp, key, count) => {
    expect(formatRelativeTime(timestamp.toISOString(), NOW)).toEqual({
      key,
      params: { count },
      count,
    });
  });

  it('passes an ISO date through beyond a week', () => {
    const label = formatRelativeTime(new Date(2026, 7, 1, 10, 0).toISOString(), NOW);

    expect(label.key).toBe('time.onDate');
    expect(label.params?.['date']).toBeDefined();
  });
});
