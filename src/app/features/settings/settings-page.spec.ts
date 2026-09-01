import { HttpResponse } from '@angular/common/http';
import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { query, text, texts } from '../../../testing/component-helpers';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { LanguageService } from '../../core/i18n/language.service';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { HttpCache } from '../../core/services/http-cache';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;

  beforeEach(async () => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        provideTestHttpWithErrorNormalisation(),
        provideFrozenClock(),
        provideTestTranslate(),
        provideAppIcons(),
      ],
    });
    useTranslations();

    fixture = TestBed.createComponent(SettingsPage);
    await drainRequests();
  });

  /**
   * Answers every pending request, repeatedly.
   *
   * `whenStable()` never resolves while a request is in flight, so anything that
   * waits on stability has to drain first — including the shared `click` helper,
   * which is why this spec clicks directly.
   */
  async function drainRequests(): Promise<void> {
    for (let round = 0; round < 8; round += 1) {
      await settle();

      const open = httpBackend().match(() => true);

      if (open.length === 0) {
        break;
      }

      open.forEach((request) => request.flush([]));
    }

    await settle();
  }

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  describe('language', () => {
    it('offers each language in its own script', async () => {
      expect(texts(fixture, '.settings__choice-label')).toEqual(['English', 'العربية']);
    });

    it('marks the active language for assistive technology', async () => {
      const choices = (fixture.nativeElement as HTMLElement).querySelectorAll('.settings__choice');

      expect(choices[0].getAttribute('aria-checked')).toBe('true');
      expect(choices[1].getAttribute('aria-checked')).toBe('false');
    });

    it('shows the locale and direction each choice implies', async () => {
      expect(texts(fixture, '.settings__choice-meta')).toEqual(['en-GB · ltr', 'ar-EG · rtl']);
    });

    it('switches the language when a choice is activated', async () => {
      const choices = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.settings__choice',
      );
      choices[1].click();
      TestBed.tick();
      await fixture.whenStable();

      expect(TestBed.inject(LanguageService).current()).toBe('ar');
      expect(TestBed.inject(LanguageService).direction()).toBe('rtl');
    });
  });

  describe('cache diagnostics', () => {
    /** Drives the real cache so the panel has something to report. */
    function seedCache(): HttpCache {
      const cache = TestBed.inject(HttpCache);

      cache.set('GET /api/tasks', new HttpResponse({ body: [], status: 200 }), 60_000);
      cache.get('GET /api/tasks');
      cache.get('GET /api/users');

      return cache;
    }

    it('reports the live counters from the cache', async () => {
      seedCache();
      await fixture.whenStable();

      const values = texts(fixture, '.settings__stat dd');

      // entries, hits, misses, de-duplicated, hit rate
      expect(values.slice(0, 4)).toEqual(['1', '1', '1', '0']);
    });

    it('computes a hit rate over resolved lookups', async () => {
      seedCache();
      await fixture.whenStable();

      expect(text(fixture, '.settings__stat--wide dd')).toBe('50%');
    });

    it('reports zero rather than NaN before anything has been looked up', async () => {
      TestBed.inject(HttpCache).resetStats();
      await fixture.whenStable();

      expect(text(fixture, '.settings__stat--wide dd')).toBe('0%');
    });

    it('clears the cache and refetches', async () => {
      const cache = seedCache();
      await settle();

      query<HTMLElement>(fixture, '.settings__panel:last-of-type button').click();
      await settle();

      expect(cache.stats().entries).toBe(0);
      expect(cache.stats().hits).toBe(0);

      // The refetch is the observable effect of clearing.
      expect(
        httpBackend().match((request) => request.url.endsWith('/tasks')).length,
      ).toBeGreaterThan(0);

      await drainRequests();
    });
  });

  it('pins the numeric hit rate to left-to-right, so RTL does not reverse it', async () => {
    expect(query(fixture, '.settings__stat--wide dd').getAttribute('dir')).toBe('ltr');
  });
});
