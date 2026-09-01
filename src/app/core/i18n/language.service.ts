import { Directionality } from '@angular/cdk/bidi';
import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppLanguage, LanguageOption } from '../interfaces';

const STORAGE_KEY = 'app.language';

/** Supported languages, with the direction and locale each one implies. */
export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', dir: 'ltr', locale: 'en-GB' },
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', dir: 'rtl', locale: 'ar-EG' },
];

const DEFAULT_LANGUAGE: AppLanguage = 'en';

/**
 * Owns the active language and everything that follows from it: the translation
 * bundle, the document `lang` and `dir`, the CDK text direction that Material
 * overlays and drag-and-drop read, and the locale used for date formatting.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly directionality = inject(Directionality);
  private readonly document = inject(DOCUMENT);

  private readonly currentState = signal<AppLanguage>(readStored() ?? DEFAULT_LANGUAGE);

  readonly current = this.currentState.asReadonly();

  readonly languages = LANGUAGES;

  constructor() {
    this.translate.addLangs(LANGUAGES.map((language) => language.code));
    this.translate.setFallbackLang(DEFAULT_LANGUAGE);

    effect(() => {
      const option = this.optionFor(this.currentState());

      this.translate.use(option.code);

      const root = this.document.documentElement;
      root.setAttribute('lang', option.code);
      root.setAttribute('dir', option.dir);

      // Feeding the CDK is what makes Material overlays, the sidenav and
      // drag-and-drop mirror without any component knowing about the language.
      if (this.directionality.value !== option.dir) {
        this.directionality.valueSignal.set(option.dir);
        this.directionality.change.emit(option.dir);
      }

      persist(option.code);
    });
  }

  /** BCP 47 locale for `Intl` formatting, derived from the active language. */
  locale(): string {
    return this.optionFor(this.currentState()).locale;
  }

  direction(): 'ltr' | 'rtl' {
    return this.optionFor(this.currentState()).dir;
  }

  use(language: AppLanguage): void {
    this.currentState.set(language);
  }

  /**
   * Resolves a pluralised key, choosing the form with `Intl.PluralRules`.
   *
   * Arabic distinguishes one, two, few and many where English has only one and
   * other, so the category has to be selected before the lookup —
   * ngx-translate interpolates but cannot select. Falls back to `other` when a
   * bundle does not define the chosen category.
   */
  plural(baseKey: string, count: number): string {
    const category = new Intl.PluralRules(this.locale()).select(count);
    const key = `${baseKey}.${category}`;
    const translated = this.translate.instant(key, { count }) as string;

    return translated === key
      ? (this.translate.instant(`${baseKey}.other`, { count }) as string)
      : translated;
  }

  private optionFor(code: AppLanguage): LanguageOption {
    return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
  }
}

function readStored(): AppLanguage | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' || stored === 'ar' ? stored : null;
  } catch {
    // Private browsing and blocked site data both throw here; the default is fine.
    return null;
  }
}

function persist(language: AppLanguage): void {
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Losing the preference is acceptable; failing to render is not.
  }
}
