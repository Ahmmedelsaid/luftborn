import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text } from '../../../testing/component-helpers';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { TopBar } from './top-bar';

describe('TopBar', () => {
  let fixture: ComponentFixture<TopBar>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TopBar],
      providers: [provideAppIcons()],
    });

    fixture = TestBed.createComponent(TopBar);
    await fixture.whenStable();
  });

  describe('search', () => {
    it('reflects the value it is given, rather than holding its own', async () => {
      fixture.componentRef.setInput('search', 'budget');
      await fixture.whenStable();

      expect(query<HTMLInputElement>(fixture, '#global-search').value).toBe('budget');
    });

    it('emits every keystroke', async () => {
      const spy = vi.fn();
      fixture.componentInstance.searchChange.subscribe(spy);

      const input = query<HTMLInputElement>(fixture, '#global-search');
      input.value = 'design';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      expect(spy).toHaveBeenCalledWith('design');
    });

    it('offers a clear action only when there is text to clear', async () => {
      expect(exists(fixture, '.bar__search-clear')).toBe(false);

      fixture.componentRef.setInput('search', 'design');
      await fixture.whenStable();

      expect(exists(fixture, '.bar__search-clear')).toBe(true);
    });

    it('emits an empty string when cleared', async () => {
      fixture.componentRef.setInput('search', 'design');
      await fixture.whenStable();

      const spy = vi.fn();
      fixture.componentInstance.searchChange.subscribe(spy);

      await click(fixture, '.bar__search-clear');

      expect(spy).toHaveBeenCalledWith('');
    });

    it('has a real label, not just a placeholder', () => {
      const label = query(fixture, 'label[for="global-search"]');

      expect(label.textContent?.trim()).toBe('Search tasks');
      expect(label.classList.contains('app-visually-hidden')).toBe(true);
    });
  });

  describe('notifications', () => {
    it('hides the dot at zero', () => {
      expect(exists(fixture, '.bar__dot')).toBe(false);
    });

    it('shows the dot and counts it in the accessible name', async () => {
      fixture.componentRef.setInput('notificationCount', 3);
      await fixture.whenStable();

      expect(exists(fixture, '.bar__dot')).toBe(true);
      expect(query(fixture, '.bar__icon-button').getAttribute('aria-label')).toBe(
        '3 unread notifications',
      );
    });
  });

  describe('menu button', () => {
    it('is absent at desktop width', () => {
      expect(exists(fixture, '.bar__menu')).toBe(false);
    });

    it('appears below the desktop breakpoint and emits a toggle', async () => {
      fixture.componentRef.setInput('showMenuButton', true);
      await fixture.whenStable();

      const spy = vi.fn();
      fixture.componentInstance.menuToggle.subscribe(spy);

      await click(fixture, '.bar__menu');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('user', () => {
    it('shows the initials and names the account for screen readers', async () => {
      fixture.componentRef.setInput('userInitials', 'AE');
      fixture.componentRef.setInput('userName', 'Ahmed Elsaid');
      await fixture.whenStable();

      expect(text(fixture, '.bar__avatar')).toBe('AE');
      expect(query(fixture, '.bar__avatar').getAttribute('aria-label')).toBe(
        'Signed in as Ahmed Elsaid',
      );
    });
  });
});
