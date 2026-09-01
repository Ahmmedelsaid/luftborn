import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { provideTestTranslate, useTranslations } from '../../../../testing/translate-helpers';
import { exists, text, texts } from '../../../../testing/component-helpers';
import { createActivity } from '../../../../testing/task.factory';
import { ActivityView } from '../../../core/interfaces';
import { provideAppIcons } from '../../icons/provide-icons';
import { ActivityFeed } from './activity-feed';

function entry(overrides: Partial<ActivityView> = {}): ActivityView {
  return {
    ...createActivity(),
    relativeTime: { key: 'time.hoursAgo', params: { count: 2 }, count: 2 },
    ...overrides,
  };
}

describe('ActivityFeed', () => {
  let fixture: ComponentFixture<ActivityFeed>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityFeed],
      providers: [provideAppIcons(), provideTestTranslate()],
    });
    useTranslations();
    fixture = TestBed.createComponent(ActivityFeed);
  });

  async function render(activities: ActivityView[], loading = false): Promise<void> {
    fixture.componentRef.setInput('activities', activities);
    fixture.componentRef.setInput('loading', loading);
    await fixture.whenStable();
  }

  it('renders an entry per activity', async () => {
    await render([entry({ id: 'a' }), entry({ id: 'b' })]);

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('.feed__item')).toHaveLength(2);
  });

  it('shows the actor, the message and the relative time', async () => {
    await render([
      entry({
        userName: 'Sarah Smith',
        type: 'completed',
        taskTitle: 'Ship it',
        relativeTime: { key: 'time.yesterday' },
      }),
    ]);

    expect(text(fixture, '.feed__actor')).toBe('Sarah Smith');
    // Composed from `type` and `taskTitle`, not from the API's English sentence.
    expect(text(fixture, '.feed__text')).toContain('completed "Ship it"');
    expect(text(fixture, '.feed__meta')).toContain('yesterday');
  });

  it('separates the actor from the message', async () => {
    await render([entry({ userName: 'John Doe', type: 'updated', taskTitle: 'Task' })]);

    // Guards a real defect: without an explicit separator these ran together as
    // "John Doeupdated".
    expect(text(fixture, '.feed__text')).toMatch(/John Doe\s+updated "Task"/);
  });

  it('falls back to the API sentence for an unmapped activity type', async () => {
    await render([entry({ type: 'archived' as never, message: 'archived "Old task"' })]);

    expect(text(fixture, '.feed__text')).toContain('archived "Old task"');
  });

  it('shows skeleton rows while loading, and no entries', async () => {
    await render([], true);

    // Four placeholder rows, each an avatar plus two text lines.
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('app-skeleton').length).toBe(12);
    expect(exists(fixture, '.feed__item-lines .feed__text')).toBe(false);
  });

  it('explains an empty feed rather than rendering nothing', async () => {
    await render([]);

    expect(text(fixture, 'app-empty-state')).toContain('No activity yet');
  });

  it('renders its heading from the translation bundle', async () => {
    await render([entry()]);

    expect(text(fixture, '.feed__title')).toBe('Recent Activity');
  });

  it.each([
    ['created', 'plus'],
    ['updated', 'edit'],
    ['completed', 'completed'],
    ['deleted', 'delete'],
    ['status_changed', 'chevron-right'],
  ] as const)('maps a %s activity to the %s icon', async (type, icon) => {
    await render([entry({ type })]);

    expect(fixture.componentInstance['iconFor'](type)).toBe(icon);
    expect(texts(fixture, '.feed__meta').length).toBe(1);
  });
});
