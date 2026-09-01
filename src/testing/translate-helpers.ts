import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import ar from '../../public/i18n/ar.json';
import en from '../../public/i18n/en.json';

/**
 * Translation providers for specs, with no HTTP loader.
 *
 * Bundles are imported directly so assertions read real copy rather than keys —
 * which also means a spec fails if a key is missing from the bundle.
 */
export function provideTestTranslate(): (Provider | EnvironmentProviders)[] {
  return [provideTranslateService({ fallbackLang: 'en' })];
}

/** Loads both bundles into the current `TestBed` and activates one. */
export function useTranslations(language: 'en' | 'ar' = 'en'): TranslateService {
  const translate = TestBed.inject(TranslateService);

  translate.setTranslation('en', en);
  translate.setTranslation('ar', ar);
  translate.use(language);

  return translate;
}
