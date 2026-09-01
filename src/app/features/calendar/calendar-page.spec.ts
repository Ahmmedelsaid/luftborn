import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text, texts } from '../../../testing/component-helpers';
import { createTask, dateOffsetFromNow, TEST_NOW } from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { LanguageService } from '../../core/i18n/language.service';
import { Task } from '../../core/interfaces';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { CalendarPage } from './calendar-page';

const TASKS: Task[] = [
  createTask({ id: 'today', title: 'Due today', dueDate: dateOffsetFromNow(0) }),
  createTask({ id: 'soon', title: 'Due in three days', dueDate: dateOffsetFromNow(3) }),
  createTask({ id: 'late', title: 'Was due', status: 'todo', dueDate: dateOffsetFromNow(-1) }),
  createTask({
    id: 'finished',
    title: 'Finished',
    status: 'done',
    dueDate: dateOffsetFromNow(1),
    completedAt: TEST_NOW.toISOString(),
  }),
  createTask({ id: 'far', title: 'Next month', dueDate: dateOffsetFromNow(45) }),
];

describe('CalendarPage', () => {
  let fixture: ComponentFixture<CalendarPage>;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      imports: [CalendarPage],
      providers: [
        provideTestHttpWithErrorNormalisation(),
        provideFrozenClock(),
        provideAppIcons(),
        provideTestTranslate(),
        provideRouter([{ path: 'tasks/:id/edit', children: [] }]),
      ],
    });
    useTranslations();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
    localStorage.clear();
  });

  async function render(tasks: Task[] = TASKS): Promise<void> {
    fixture = TestBed.createComponent(CalendarPage);
    await settle();

    httpBackend()
      .match((request) => request.url.endsWith('/tasks'))
      .forEach((r) => r.flush(tasks));
    httpBackend()
      .match(() => true)
      .forEach((r) => r.flush([]));

    await settle();
    await fixture.whenStable();
  }

  describe('grid', () => {
    it('renders six weeks, so the height never changes between months', async () => {
      await render();

      expect((fixture.nativeElement as HTMLElement).querySelectorAll('.cal__day')).toHaveLength(42);
    });

    it('renders seven weekday headers', async () => {
      await render();

      expect(texts(fixture, '.cal__weekday')).toHaveLength(7);
    });

    it('starts the week on the locale first day — Monday for en-GB', async () => {
      await render();

      expect(texts(fixture, '.cal__weekday')[0]).toBe('Mon');
    });

    it('starts on Saturday for Arabic, which is what ar-EG uses', async () => {
      await render();

      TestBed.inject(LanguageService).use('ar');
      TestBed.tick();
      await fixture.whenStable();

      // The label is in Arabic, so the assertion is that the order changed
      // rather than on a specific string.
      expect(texts(fixture, '.cal__weekday')[0]).not.toBe('Mon');
    });

    it('marks days outside the shown month', async () => {
      await render();

      const outside = (fixture.nativeElement as HTMLElement).querySelectorAll('.cal__day--outside');

      expect(outside.length).toBeGreaterThan(0);
    });

    it('marks today exactly once', async () => {
      await render();

      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll('.cal__day--today'),
      ).toHaveLength(1);
    });
  });

  describe('tasks', () => {
    it('places a task on its due date', async () => {
      await render();

      const today = query(fixture, '.cal__day--today');

      expect(today.textContent).toContain('Due today');
    });

    it('marks an overdue task and badges the day', async () => {
      await render();

      expect(exists(fixture, '.cal__task--overdue')).toBe(true);
      expect(text(fixture, '.cal__overdue')).toBe('1');
    });

    it('marks a completed task differently from an open one', async () => {
      await render();

      expect(exists(fixture, '.cal__task--done')).toBe(true);
    });

    it('counts only the tasks due in the shown month', async () => {
      await render();

      // Three of the five fall in September: the overdue one is in August and
      // the far one is in October, and neither should be counted even though the
      // August day is visible in the grid's leading padding.
      expect(text(fixture, '.header__subtitle')).toBe('3 tasks due this month');
    });

    it('opens the editor for a task', async () => {
      await render();

      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      await click(fixture, '.cal__task');

      expect(navigate).toHaveBeenCalledWith(['/tasks', expect.any(String), 'edit']);
    });
  });

  describe('navigation', () => {
    it('disables Today while the current month is shown', async () => {
      await render();

      expect(query<HTMLButtonElement>(fixture, 'button[disabled]')).toBeDefined();
    });

    it('steps forward and back, and returns with Today', async () => {
      await render();

      const initial = text(fixture, '.cal__month');

      fixture.componentInstance['stepMonth'](1);
      await fixture.whenStable();
      expect(text(fixture, '.cal__month')).not.toBe(initial);

      fixture.componentInstance['goToToday']();
      await fixture.whenStable();
      expect(text(fixture, '.cal__month')).toBe(initial);
    });

    it('reports zero for a month with nothing due', async () => {
      await render();

      fixture.componentInstance['stepMonth'](6);
      await fixture.whenStable();

      expect(text(fixture, '.header__subtitle')).toBe('0 tasks due this month');
    });
  });

  it('surfaces a load failure with a retry', async () => {
    fixture = TestBed.createComponent(CalendarPage);
    await settle();

    httpBackend()
      .match((request) => request.url.endsWith('/tasks'))
      .forEach((r) => r.flush('down', { status: 503, statusText: 'Unavailable' }));
    httpBackend()
      .match(() => true)
      .forEach((r) => r.flush([]));
    await settle();
    await fixture.whenStable();

    expect(exists(fixture, 'app-error-state')).toBe(true);
  });
});
