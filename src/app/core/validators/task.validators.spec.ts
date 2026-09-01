import { FormArray, FormControl, FormGroup } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { TEST_NOW } from '../../../testing/task.factory';
import { toApiDateString } from '../utils/date.utils';
import {
  doneCannotBeDueLater,
  dueDateNotInPast,
  dueDateWithinHorizon,
  highPriorityNeedsDueDate,
  notBlank,
  uniqueTags,
} from './task.validators';

const now = (): Date => TEST_NOW;

/** A date offset from the frozen clock by whole days. */
function dateOffset(days: number): Date {
  const date = new Date(TEST_NOW);
  date.setDate(date.getDate() + days);
  return date;
}

describe('notBlank', () => {
  const validate = notBlank();

  it('accepts a value with real content', () => {
    expect(validate(new FormControl('Ship it'))).toBeNull();
  });

  it('rejects whitespace only, which `Validators.required` accepts', () => {
    expect(validate(new FormControl('   '))).toEqual({ notBlank: true });
    expect(validate(new FormControl('\t\n'))).toEqual({ notBlank: true });
  });

  it('defers to `required` for an empty value rather than duplicating it', () => {
    expect(validate(new FormControl(''))).toBeNull();
    expect(validate(new FormControl(null))).toBeNull();
  });

  it('ignores non-string values', () => {
    expect(validate(new FormControl(42))).toBeNull();
  });
});

describe('dueDateNotInPast', () => {
  const validate = dueDateNotInPast(now);

  it('accepts today', () => {
    expect(validate(new FormControl(dateOffset(0)))).toBeNull();
  });

  it('accepts a future date', () => {
    expect(validate(new FormControl(dateOffset(30)))).toBeNull();
  });

  it('rejects a past date and reports how far back it is', () => {
    expect(validate(new FormControl(dateOffset(-3)))).toEqual({
      dueDateInPast: { daysLate: 3 },
    });
  });

  it('accepts a `YYYY-MM-DD` string as well as a Date', () => {
    expect(validate(new FormControl(toApiDateString(dateOffset(2))))).toBeNull();
    expect(validate(new FormControl(toApiDateString(dateOffset(-2))))).not.toBeNull();
  });

  it('reports an unparseable value rather than passing it through', () => {
    expect(validate(new FormControl('not a date'))).toEqual({ dueDateInvalid: true });
  });

  it('leaves an empty value to `required`', () => {
    expect(validate(new FormControl(null))).toBeNull();
  });
});

describe('dueDateWithinHorizon', () => {
  const validate = dueDateWithinHorizon(now, 5);

  it('accepts a date inside the horizon', () => {
    expect(validate(new FormControl(dateOffset(365)))).toBeNull();
  });

  it('rejects a date far beyond it, which is almost always a typo', () => {
    expect(validate(new FormControl(dateOffset(365 * 20)))).toEqual({
      dueDateTooFar: { maxYears: 5 },
    });
  });

  it('ignores an unparseable value, which the other rule reports', () => {
    expect(validate(new FormControl('nonsense'))).toBeNull();
  });
});

describe('uniqueTags', () => {
  const validate = uniqueTags();

  /** A tag array built from plain strings. */
  function tags(...values: string[]): FormArray<FormControl<string>> {
    return new FormArray(values.map((value) => new FormControl(value, { nonNullable: true })));
  }

  it('accepts distinct tags', () => {
    expect(validate(tags('Design', 'Frontend'))).toBeNull();
  });

  it('accepts an empty array', () => {
    expect(validate(tags())).toBeNull();
  });

  it('rejects duplicates and names them', () => {
    expect(validate(tags('Design', 'Design'))).toEqual({ duplicateTags: { tags: ['Design'] } });
  });

  it('treats casing and surrounding space as the same tag', () => {
    expect(validate(tags('Design', ' design '))).not.toBeNull();
  });

  it('ignores blank entries, so an unfilled input is not a duplicate', () => {
    expect(validate(tags('', '', 'Design'))).toBeNull();
  });
});

describe('highPriorityNeedsDueDate', () => {
  const validate = highPriorityNeedsDueDate();

  /** The two fields the rule reads. */
  function group(priority: string, dueDate: Date | null): FormGroup {
    return new FormGroup({
      priority: new FormControl(priority),
      dueDate: new FormControl(dueDate),
    });
  }

  it('requires a date when the priority is high', () => {
    expect(validate(group('high', null))).toEqual({ highPriorityNeedsDueDate: true });
  });

  it('is satisfied once a date is set', () => {
    expect(validate(group('high', dateOffset(3)))).toBeNull();
  });

  it('does not apply to other priorities', () => {
    expect(validate(group('medium', null))).toBeNull();
    expect(validate(group('low', null))).toBeNull();
  });
});

describe('doneCannotBeDueLater', () => {
  const validate = doneCannotBeDueLater(now);

  function group(status: string, dueDate: Date | null): FormGroup {
    return new FormGroup({
      status: new FormControl(status),
      dueDate: new FormControl(dueDate),
    });
  }

  it('rejects a done task due in the future', () => {
    expect(validate(group('done', dateOffset(5)))).toEqual({ doneCannotBeDueLater: true });
  });

  it('accepts a done task due today or earlier', () => {
    expect(validate(group('done', dateOffset(0)))).toBeNull();
    expect(validate(group('done', dateOffset(-5)))).toBeNull();
  });

  it('does not apply to unfinished tasks', () => {
    expect(validate(group('todo', dateOffset(5)))).toBeNull();
    expect(validate(group('in_progress', dateOffset(5)))).toBeNull();
  });

  it('ignores a missing date', () => {
    expect(validate(group('done', null))).toBeNull();
  });
});
