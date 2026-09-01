import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { startWith, switchMap } from 'rxjs';

/**
 * Maps a validator key to the message a user should read.
 *
 * Centralised so every field phrases the same failure the same way, and so a new
 * validator cannot ship without copy — an unmapped key falls through to a
 * generic message rather than rendering `[object Object]`.
 */
const MESSAGES: Readonly<Record<string, (error: unknown) => string>> = {
  required: () => 'This field is required.',
  notBlank: () => 'This cannot be only spaces.',
  minlength: (error) =>
    `Use at least ${(error as { requiredLength: number }).requiredLength} characters.`,
  maxlength: (error) =>
    `Use at most ${(error as { requiredLength: number }).requiredLength} characters.`,
  dueDateInPast: (error) => {
    const { daysLate } = error as { daysLate: number };
    return `That date is ${daysLate} ${daysLate === 1 ? 'day' : 'days'} in the past.`;
  },
  dueDateInvalid: () => 'Enter a valid date.',
  dueDateTooFar: (error) => `Pick a date within ${(error as { maxYears: number }).maxYears} years.`,
  duplicateTags: (error) => {
    const { tags } = error as { tags: string[] };
    return `Remove the duplicate ${tags.length === 1 ? 'tag' : 'tags'}: ${tags.join(', ')}.`;
  },
  highPriorityNeedsDueDate: () => 'A high-priority task needs a due date.',
  doneCannotBeDueLater: () => 'A task marked done cannot be due in the future.',
  matDatepickerParse: () => 'Enter a valid date.',
};

/**
 * Renders the first failure of a control, but only once the user has had a chance
 * to fix it — after a blur or a submit attempt, never while they are still typing
 * their first character.
 */
@Component({
  selector: 'app-field-error',
  template: `
    @if (message()) {
      <span class="field-error" role="alert">{{ message() }}</span>
    }
  `,
  styles: `
    .field-error {
      display: block;
      color: var(--app-overdue-fg);
      font-size: 12px;
      line-height: 1.4;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldError {
  readonly control = input.required<AbstractControl>();

  /** True once the form has been submitted, which reveals untouched failures. */
  readonly submitted = input<boolean>(false);

  /**
   * Validity and touched state live on the control, not in a signal, so the
   * component subscribes to `control.events` — which emits on value, status and
   * touched changes — and uses that as its reactive dependency.
   */
  private readonly controlEvents = toSignal(
    toObservable(this.control).pipe(switchMap((control) => control.events.pipe(startWith(null)))),
    { initialValue: null },
  );

  protected readonly message = computed<string | null>(() => {
    this.controlEvents();

    const control = this.control();

    if (control.valid || (!control.touched && !this.submitted())) {
      return null;
    }

    return firstMessage(control.errors);
  });
}

function firstMessage(errors: ValidationErrors | null): string | null {
  if (!errors) {
    return null;
  }

  const [key, value] = (Object.entries(errors) as [string, unknown][])[0];
  const format = MESSAGES[key];

  return format ? format(value) : 'This value is not valid.';
}
