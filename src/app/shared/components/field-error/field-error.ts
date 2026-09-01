import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { startWith, switchMap } from 'rxjs';
import { LanguageService } from '../../../core/i18n/language.service';

/**
 * Maps a validator key to its translation key, and to the params that key needs.
 *
 * Centralised so every field phrases the same failure the same way, and so a new
 * validator cannot ship without copy — an unmapped key falls through to a
 * generic message rather than rendering `[object Object]`.
 */
const MESSAGES: Readonly<
  Record<
    string,
    (error: unknown) => { key: string; params?: Record<string, string | number>; count?: number }
  >
> = {
  required: () => ({ key: 'validation.required' }),
  notBlank: () => ({ key: 'validation.notBlank' }),
  minlength: (error) => ({
    key: 'validation.minlength',
    params: { length: (error as { requiredLength: number }).requiredLength },
  }),
  maxlength: (error) => ({
    key: 'validation.maxlength',
    params: { length: (error as { requiredLength: number }).requiredLength },
  }),
  dueDateInPast: (error) => {
    const { daysLate } = error as { daysLate: number };
    return { key: 'validation.dueDateInPast', params: { count: daysLate }, count: daysLate };
  },
  dueDateInvalid: () => ({ key: 'validation.dueDateInvalid' }),
  dueDateTooFar: (error) => ({
    key: 'validation.dueDateTooFar',
    params: { years: (error as { maxYears: number }).maxYears },
  }),
  duplicateTags: (error) => {
    const { tags } = error as { tags: string[] };
    return {
      key: 'validation.duplicateTags',
      params: { tags: tags.join(', '), count: tags.length },
      count: tags.length,
    };
  },
  highPriorityNeedsDueDate: () => ({ key: 'validation.highPriorityNeedsDueDate' }),
  doneCannotBeDueLater: () => ({ key: 'validation.doneCannotBeDueLater' }),
  matDatepickerParse: () => ({ key: 'validation.dueDateInvalid' }),
};

/**
 * Renders the first failure of a control, but only once the user has had a
 * chance to fix it — after a blur or a submit attempt, never while they are
 * still typing their first character.
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
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

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

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  protected readonly message = computed<string | null>(() => {
    this.controlEvents();
    this.languageRevision();

    const control = this.control();

    if (control.valid || (!control.touched && !this.submitted())) {
      return null;
    }

    return this.resolve(control.errors);
  });

  private resolve(errors: ValidationErrors | null): string | null {
    if (!errors) {
      return null;
    }

    const [key, value] = (Object.entries(errors) as [string, unknown][])[0];
    const format = MESSAGES[key];

    if (!format) {
      return this.translate.instant('validation.generic') as string;
    }

    const message = format(value);

    return message.count === undefined
      ? (this.translate.instant(message.key, message.params) as string)
      : this.language.plural(message.key, message.count);
  }
}
