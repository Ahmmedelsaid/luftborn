import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { differenceInCalendarDays, parseApiDate } from '../utils/date.utils';

/** `Validators.required` accepts `"   "`, which would render as an empty card. */
export function notBlank(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;

    if (typeof value !== 'string' || value.length === 0) {
      return null;
    }

    return value.trim().length === 0 ? { notBlank: true } : null;
  };
}

/** Takes `now` rather than reading the clock, so the rule stays testable. */
export function dueDateNotInPast(now: () => Date): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | Date | null;

    if (!value) {
      return null;
    }

    const due = value instanceof Date ? value : parseApiDate(value);

    if (Number.isNaN(due.getTime())) {
      return { dueDateInvalid: true };
    }

    const days = differenceInCalendarDays(due, now());

    return days < 0 ? { dueDateInPast: { daysLate: Math.abs(days) } } : null;
  };
}

export function dueDateWithinHorizon(now: () => Date, maxYears = 5): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | Date | null;

    if (!value) {
      return null;
    }

    const due = value instanceof Date ? value : parseApiDate(value);

    if (Number.isNaN(due.getTime())) {
      return null;
    }

    const horizon = new Date(now());
    horizon.setFullYear(horizon.getFullYear() + maxYears);

    return due > horizon ? { dueDateTooFar: { maxYears } } : null;
  };
}

/** Applied to the array, not each control: being a duplicate depends on siblings. */
export function uniqueTags(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const values = (control.value as unknown[]) ?? [];
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }

      const key = value.trim().toLowerCase();

      if (key.length === 0) {
        continue;
      }

      if (seen.has(key)) {
        duplicates.add(value.trim());
      }

      seen.add(key);
    }

    return duplicates.size > 0 ? { duplicateTags: { tags: [...duplicates] } } : null;
  };
}

/** Cross-field: a high-priority task with no deadline never gets done. */
export function highPriorityNeedsDueDate(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const priority = group.get('priority')?.value as string | null;
    const dueDate = group.get('dueDate')?.value as unknown;

    if (priority !== 'high') {
      return null;
    }

    return dueDate ? null : { highPriorityNeedsDueDate: true };
  };
}

/** Cross-field: neither field is wrong alone, the combination cannot have happened. */
export function doneCannotBeDueLater(now: () => Date): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const status = group.get('status')?.value as string | null;
    const value = group.get('dueDate')?.value as string | Date | null;

    if (status !== 'done' || !value) {
      return null;
    }

    const due = value instanceof Date ? value : parseApiDate(value);

    if (Number.isNaN(due.getTime())) {
      return null;
    }

    return differenceInCalendarDays(due, now()) > 0 ? { doneCannotBeDueLater: true } : null;
  };
}
