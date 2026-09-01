import { Directionality } from '@angular/cdk/bidi';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { LanguageService } from './language.service';

describe('LanguageService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('lang');
    document.documentElement.removeAttribute('dir');

    TestBed.configureTestingModule({ providers: [provideTestTranslate()] });
    useTranslations();
  });

  afterEach(() => {
    localStorage.clear();
  });

  /** Instantiating runs the effect that applies the language. */
  function service(): LanguageService {
    const instance = TestBed.inject(LanguageService);
    TestBed.tick();
    return instance;
  }

  it('starts in English', () => {
    expect(service().current()).toBe('en');
  });

  it('sets the document language and direction', () => {
    service();

    expect(document.documentElement.getAttribute('lang')).toBe('en');
    expect(document.documentElement.getAttribute('dir')).toBe('ltr');
  });

  it('switches the document to right-to-left for Arabic', () => {
    const language = service();

    language.use('ar');
    TestBed.tick();

    expect(document.documentElement.getAttribute('lang')).toBe('ar');
    expect(document.documentElement.getAttribute('dir')).toBe('rtl');
    expect(language.direction()).toBe('rtl');
  });

  it('feeds the CDK direction, which is what makes Material mirror', () => {
    const language = service();
    const directionality = TestBed.inject(Directionality);

    expect(directionality.value).toBe('ltr');

    language.use('ar');
    TestBed.tick();

    expect(directionality.value).toBe('rtl');
  });

  it('exposes a locale per language, for Intl formatting', () => {
    const language = service();

    expect(language.locale()).toBe('en-GB');

    language.use('ar');
    TestBed.tick();

    expect(language.locale()).toBe('ar-EG');
  });

  it('remembers the choice across instances', () => {
    service().use('ar');
    TestBed.tick();

    expect(localStorage.getItem('app.language')).toBe('ar');
  });

  it('ignores a stored value that is not a supported language', () => {
    localStorage.setItem('app.language', 'klingon');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideTestTranslate()] });
    useTranslations();

    expect(service().current()).toBe('en');
  });

  describe('plural selection', () => {
    it('uses the English one/other forms', () => {
      const language = service();

      expect(language.plural('task.due.inDays', 1)).toBe('Due in 1 day');
      expect(language.plural('task.due.inDays', 5)).toBe('Due in 5 days');
    });

    it('uses the Arabic dual form, which English does not have', () => {
      const language = service();
      language.use('ar');
      TestBed.tick();

      // `Intl.PluralRules('ar-EG').select(2)` is 'two'.
      expect(language.plural('task.due.inDays', 2)).toBe('تستحق بعد يومين');
    });

    it('distinguishes the Arabic few and many forms', () => {
      const language = service();
      language.use('ar');
      TestBed.tick();

      expect(language.plural('task.due.inDays', 3)).toContain('أيام');
      expect(language.plural('task.due.inDays', 15)).toContain('يومًا');
    });

    it('falls back to `other` when a bundle omits the chosen category', () => {
      const language = service();

      // English has no `two`, so a count of 2 resolves through `other`.
      expect(language.plural('task.due.inDays', 2)).toBe('Due in 2 days');
    });
  });
});
