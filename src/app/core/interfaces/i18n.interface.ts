export type AppLanguage = 'en' | 'ar';

/** A supported language and everything that follows from choosing it. */
export interface LanguageOption {
  readonly code: AppLanguage;
  /** English name, for the accessible label. */
  readonly label: string;
  /** Name in its own script, which is what the switcher shows. */
  readonly nativeLabel: string;
  readonly dir: 'ltr' | 'rtl';
  /** BCP 47 locale for `Intl` formatting. */
  readonly locale: string;
}

/**
 * A message that has to be translated at render time.
 *
 * Pure derivations return this instead of an English string, so the view layer
 * owns localisation and the utilities stay free of any language.
 */
export interface LocalisedLabel {
  readonly key: string;
  /** Interpolation values, and the count used for plural selection. */
  readonly params?: Readonly<Record<string, string | number>>;
  /** When set, the key is a plural base and the form is chosen by locale. */
  readonly count?: number;
}
