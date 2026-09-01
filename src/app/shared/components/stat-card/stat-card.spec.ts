import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text } from '../../../../testing/component-helpers';
import { createStatistic } from '../../../../testing/task.factory';
import { Statistic } from '../../../core/interfaces';
import { provideAppIcons } from '../../icons/provide-icons';
import { StatCard } from './stat-card';

describe('StatCard', () => {
  let fixture: ComponentFixture<StatCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [StatCard],
      providers: [provideAppIcons()],
    });
    fixture = TestBed.createComponent(StatCard);
  });

  async function render(
    statistic: Statistic,
    extra?: { interactive?: boolean; active?: boolean },
  ): Promise<void> {
    fixture.componentRef.setInput('statistic', statistic);

    if (extra?.interactive !== undefined) {
      fixture.componentRef.setInput('interactive', extra.interactive);
    }
    if (extra?.active !== undefined) {
      fixture.componentRef.setInput('active', extra.active);
    }

    await fixture.whenStable();
  }

  it('renders the title, value and delta from the api payload', async () => {
    await render(createStatistic({ title: 'Total Tasks', value: 156, change: '+12' }));

    expect(text(fixture, '.stat__label')).toContain('Total Tasks');
    expect(text(fixture, '.stat__value')).toBe('156');
    expect(text(fixture, '.stat__delta-change')).toBe('+12');
  });

  it.each(['0', '+0', ''])('hides a zero delta (%s), as the design does', async (change) => {
    await render(createStatistic({ change, changeLabel: 'Same as yesterday' }));

    expect(exists(fixture, '.stat__delta-change')).toBe(false);
    expect(text(fixture, '.stat__delta')).toBe('Same as yesterday');
  });

  it.each([
    ['positive', 'stat__delta--positive'],
    ['negative', 'stat__delta--negative'],
    ['neutral', 'stat__delta--neutral'],
  ] as const)('styles a %s change type', async (changeType, className) => {
    await render(createStatistic({ changeType }));

    expect(exists(fixture, `.${className}`)).toBe(true);
  });

  it('applies the per-card accent colour the api supplies', async () => {
    await render(createStatistic({ color: '#D32F2F' }));

    expect((fixture.nativeElement as HTMLElement).style.getPropertyValue('--app-stat-color')).toBe(
      '#D32F2F',
    );
  });

  it('maps a known emoji to a glyph', async () => {
    await render(createStatistic({ icon: '📊' }));

    expect(exists(fixture, 'mat-icon.stat__icon')).toBe(true);
    expect(exists(fixture, '.stat__icon--emoji')).toBe(false);
  });

  it('falls back to the emoji itself when unmapped, so no tile renders blank', async () => {
    await render(createStatistic({ icon: '🚀' }));

    expect(exists(fixture, 'mat-icon.stat__icon')).toBe(false);
    expect(text(fixture, '.stat__icon--emoji')).toBe('🚀');
  });

  describe('as a filter shortcut', () => {
    it('is a static group by default, not a control', async () => {
      await render(createStatistic());

      expect(exists(fixture, '.stat__button')).toBe(false);
      expect(query(fixture, '.stat__static').getAttribute('role')).toBe('group');
    });

    it('becomes a button when interactive', async () => {
      await render(createStatistic(), { interactive: true });

      expect(exists(fixture, '.stat__button')).toBe(true);
    });

    it('emits the statistic when activated', async () => {
      await render(createStatistic({ id: 'stat-004' }), { interactive: true });

      const spy = vi.fn();
      fixture.componentInstance.filter.subscribe(spy);

      await click(fixture, '.stat__button');

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'stat-004' }));
    });

    it('reports its pressed state', async () => {
      await render(createStatistic(), { interactive: true, active: true });

      expect(query(fixture, '.stat__button').getAttribute('aria-pressed')).toBe('true');
      expect((fixture.nativeElement as HTMLElement).classList.contains('stat--active')).toBe(true);
    });

    it('mentions the filter behaviour in its accessible name', async () => {
      await render(createStatistic({ title: 'Overdue' }), { interactive: true });

      expect(query(fixture, '.stat__button').getAttribute('aria-label')).toContain(
        'Activates the matching filter',
      );
    });
  });
});
