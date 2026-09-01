import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { click, query, texts } from '../../../testing/component-helpers';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { Shell } from './shell';

/** Drives the CDK breakpoint observer so the spec controls the viewport tier. */
class FakeBreakpointObserver {
  readonly matches = new BehaviorSubject<boolean>(true);

  observe(): BehaviorSubject<BreakpointState> {
    const state = new BehaviorSubject<BreakpointState>({
      matches: this.matches.value,
      breakpoints: {},
    });
    this.matches.subscribe((matches) => state.next({ matches, breakpoints: {} }));
    return state;
  }

  isMatched(): boolean {
    return this.matches.value;
  }
}

describe('Shell', () => {
  let fixture: ComponentFixture<Shell>;
  let breakpoints: FakeBreakpointObserver;

  beforeEach(async () => {
    breakpoints = new FakeBreakpointObserver();

    TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideTestHttpWithErrorNormalisation(),
        provideFrozenClock(),
        provideAppIcons(),
        provideRouter([
          { path: 'dashboard', children: [] },
          { path: 'tasks', children: [] },
          { path: 'tasks/new', children: [] },
          { path: 'calendar', children: [] },
          { path: 'analytics', children: [] },
          { path: 'team', children: [] },
          { path: 'settings', children: [] },
        ]),
        { provide: BreakpointObserver, useValue: breakpoints },
        provideTestTranslate(),
      ],
    });

    useTranslations();
    fixture = TestBed.createComponent(Shell);
    await settle();

    httpBackend()
      .match(() => true)
      .forEach((request) => request.flush([]));
    await settle();
    await fixture.whenStable();
  });

  afterEach(() => {
    httpBackend().verify({ ignoreCancelled: true });
  });

  it('renders the navigation the design specifies, in order', () => {
    expect(texts(fixture, '.nav__label')).toEqual([
      'Dashboard',
      'Tasks',
      'Calendar',
      'Analytics',
      'Team',
      'Settings',
    ]);
  });

  it('puts a skip link first, so keyboard users can bypass the nav', () => {
    const host = fixture.nativeElement as HTMLElement;
    const first = host.querySelector('a');

    expect(first?.classList.contains('app-skip-link')).toBe(true);
    expect(first?.getAttribute('href')).toBe('#main-content');
  });

  it('exposes the routed area as a focusable main landmark', () => {
    const main = query(fixture, 'main#main-content');

    expect(main.getAttribute('tabindex')).toBe('-1');
  });

  describe('responsive navigation', () => {
    it('keeps the rail permanent at desktop width, with no menu button', () => {
      const host = fixture.nativeElement as HTMLElement;

      expect(host.querySelector('.bar__menu')).toBeNull();
    });

    it('switches to an overlay drawer below the desktop breakpoint', async () => {
      breakpoints.matches.next(false);
      await fixture.whenStable();

      const host = fixture.nativeElement as HTMLElement;

      expect(host.querySelector('.bar__menu')).not.toBeNull();
    });

    it('opens and closes the drawer from the menu button', async () => {
      breakpoints.matches.next(false);
      await fixture.whenStable();

      await click(fixture, '.bar__menu');
      expect(fixture.componentInstance['drawerOpen']()).toBe(true);

      await click(fixture, '.bar__menu');
      expect(fixture.componentInstance['drawerOpen']()).toBe(false);
    });

    it('closes the drawer after a navigation choice', async () => {
      breakpoints.matches.next(false);
      await fixture.whenStable();

      await click(fixture, '.bar__menu');
      await click(fixture, '.nav__link');

      expect(fixture.componentInstance['drawerOpen']()).toBe(false);
    });
  });

  describe('global search', () => {
    it('feeds the top bar from the task store, not from local state', async () => {
      const input = query<HTMLInputElement>(fixture, '#global-search');
      input.value = 'budget';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(fixture.componentInstance['search']()).toBe('budget');
    });
  });

  it('routes to the composer from the rail action', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await click(fixture, '.nav__cta');

    expect(navigate).toHaveBeenCalledWith(['/tasks/new']);
  });
});
