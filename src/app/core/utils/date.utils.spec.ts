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
    [-2, 'Overdue by 2 days'],
    [-1, 'Overdue by 1 day'],
    [0, 'Due today'],
    [1, 'Due tomorrow'],
    [5, 'Due in 5 days'],
    [7, 'Due in 1 week'],
  ])('renders %i days as "%s"', (days, expected) => {
    expect(formatDueLabel(days)).toBe(expected);
  });
});

describe('formatCompletedLabel', () => {
  it('says "today" for a same-day completion', () => {
    expect(formatCompletedLabel(new Date(2026, 8, 1, 9, 0).toISOString(), NOW)).toBe(
      'Completed today',
    );
  });

  it('says "yesterday" for the previous day', () => {
    expect(formatCompletedLabel(new Date(2026, 7, 31, 9, 0).toISOString(), NOW)).toBe(
      'Completed yesterday',
    );
  });

  it('counts days within the last week', () => {
    expect(formatCompletedLabel(new Date(2026, 7, 29, 9, 0).toISOString(), NOW)).toBe(
      'Completed 3 days ago',
    );
  });

  it('falls back to an absolute date beyond a week', () => {
    expect(formatCompletedLabel(new Date(2026, 7, 10, 9, 0).toISOString(), NOW)).toMatch(
      /^Completed on /,
    );
  });
});

describe('formatRelativeTime', () => {
  it.each([
    [new Date(2026, 8, 1, 11, 59, 30), 'just now'],
    [new Date(2026, 8, 1, 11, 45), '15 minutes ago'],
    [new Date(2026, 8, 1, 11, 0), '1 hour ago'],
    [new Date(2026, 8, 1, 4, 0), '8 hours ago'],
    [new Date(2026, 7, 31, 10, 0), 'yesterday'],
    [new Date(2026, 7, 28, 10, 0), '4 days ago'],
  ])('renders %s as "%s"', (timestamp, expected) => {
    expect(formatRelativeTime(timestamp.toISOString(), NOW)).toBe(expected);
  });

  it('falls back to an absolute date beyond a week', () => {
    expect(formatRelativeTime(new Date(2026, 7, 1, 10, 0).toISOString(), NOW)).not.toMatch(/ago$/);
  });
});
