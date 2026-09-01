import { inject, Pipe, PipeTransform } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { LocalisedLabel } from '../interfaces';
import { LanguageService } from './language.service';

/**
 * Renders a {@link LocalisedLabel} produced by the pure derivations.
 *
 * Impure, because it has to re-run when the language changes: the pipe depends
 * on a signal fed by the translate service's change stream, which is what makes
 * a language switch repaint every derived label without a reload.
 *
 * A `date` param is formatted with the active locale rather than interpolated
 * raw, so "Completed on 24 Aug" becomes "أُكمل في ٢٤ أغسطس".
 */
@Pipe({ name: 'localise', pure: false })
export class LocalisePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  private readonly revision = toSignal(this.translate.onLangChange, { initialValue: null });

  transform(label: LocalisedLabel | null | undefined): string {
    if (!label) {
      return '';
    }

    // Establishes the dependency that makes the pipe recompute on a switch.
    this.revision();

    const params = this.formatParams(label.params);

    return label.count === undefined
      ? (this.translate.instant(label.key, params) as string)
      : this.language.plural(label.key, label.count);
  }

  private formatParams(
    params: LocalisedLabel['params'],
  ): Record<string, string | number> | undefined {
    if (!params) {
      return undefined;
    }

    const formatted: Record<string, string | number> = { ...params };
    const date = params['date'];

    if (typeof date === 'string') {
      formatted['date'] = new Date(date).toLocaleDateString(this.language.locale(), {
        month: 'short',
        day: 'numeric',
      });
    }

    return formatted;
  }
}
