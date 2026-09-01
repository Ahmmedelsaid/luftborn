import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { click, exists, text, texts } from '../../../testing/component-helpers';
import {
  createActivity,
  createStatistic,
  createTask,
  createUser,
  dateOffsetFromNow,
} from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { Task } from '../../core/interfaces';
import { TaskStore } from '../../core/state/task-store';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { DashboardPage } from './dashboard-page';

/**
 * Integration coverage for the dashboard: a real component tree over the real
 * stores, with only the HTTP backend, the clock and the confirmation dialog
 * stubbed. This is what proves the store wiring, the presentational components
 * and the routing actually fit together.
 */
describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let confirmSpy: ReturnType<typeof vi.fn>;
  let snackBarSpy: ReturnType<typeof vi.fn>;

  const TASKS: Task[] = [
    createTask({ id: 'task-a', title: 'Design homepage', status: 'todo', priority: 'high' }),
    createTask({
      id: 'task-b',
      title: 'Ship auth',
      status: 'in_progress',
      priority: 'medium',
      assignee: { id: 'user-002', name: 'Sarah Smith', avatar: 'SS', email: 's@c.com' },
    }),
    createTask({
      id: 'task-c',
      title: 'Fix login bug',
      status: 'done',
      priority: 'low',
      completedAt: dateOffsetFromNow(0),
    }),
    createTask({
      id: 'task-d',
      title: 'Q4 budget report',
      status: 'todo',
      priority: 'high',
      dueDate: dateOffsetFromNow(-3),
    }),
  ];

  beforeEach(async () => {
    confirmSpy = vi.fn().mockResolvedValue(true);
    snackBarSpy = vi.fn();

    TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        provideTestHttpWithErrorNormalisation(),
        provideFrozenClock(),
        provideAppIcons(),
        provideRouter([{ path: 'tasks/new', children: [] }]),
        provideTestTranslate(),
        { provide: ConfirmDialogService, useValue: { ask: confirmSpy } },
        { provide: MatSnackBar, useValue: { open: snackBarSpy } },
      ],
    });

    useTranslations();
    fixture = TestBed.createComponent(DashboardPage);
    await settle();

    const backend = httpBackend();
    backend.match((request) => request.url.endsWith('/tasks')).forEach((r) => r.flush(TASKS));
    backend
      .match((request) => request.url.endsWith('/statistics'))
      .forEach((r) =>
        r.flush([
          createStatistic({ id: 'stat-001', title: 'Total Tasks', value: 156 }),
          createStatistic({ id: 'stat-004', title: 'Overdue', value: 25, icon: '⚠️' }),
        ]),
      );
    backend
      .match((request) => request.url.endsWith('/users'))
      .forEach((r) => r.flush([createUser({ id: 'user-001' }), createUser({ id: 'user-002' })]));
    backend
      .match((request) => request.url.endsWith('/activities'))
      .forEach((r) => r.flush([createActivity()]));

    await settle();
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  /**
   * Answers every pending write, repeatedly: a task mutation fans out to the
   * activity feed only once its own response has resolved.
   */
  async function flushWrites(body: unknown = {}, status?: number): Promise<void> {
    for (let round = 0; round < 4; round += 1) {
      const pending = httpBackend().match(() => true);

      if (pending.length === 0) {
        break;
      }

      for (const request of pending) {
        if (status !== undefined) {
          request.flush(body as never, { status, statusText: 'Error' });
          continue;
        }

        // Each collection gets a body of its own shape, so the store never
        // reconciles against something the UI cannot render.
        request.flush(
          (request.request.url.endsWith('/activities')
            ? createActivity({ id: 'activity-new' })
            : body) as never,
        );
      }

      await settle();
      await fixture.whenStable();
    }
  }

  describe('initial render', () => {
    it('renders the statistic tiles from the api', async () => {
      expect(texts(fixture, '.stat__value')).toEqual(['156', '25']);
    });

    it('renders the board with one column per status', async () => {
      expect(texts(fixture, '.board__title')).toEqual(['To Do', 'In Progress', 'Done']);
    });

    it('places each task in its own column', async () => {
      expect(texts(fixture, '.board__count')).toEqual(['2', '1', '1']);
    });

    it('summarises the working set in the page header', async () => {
      expect(text(fixture, '.header__subtitle')).toBe('4 tasks · 1 overdue');
    });

    it('renders the activity feed', async () => {
      expect(exists(fixture, 'app-activity-feed .feed__item')).toBe(true);
    });
  });

  describe('filtering', () => {
    it('narrows the board when a status segment is chosen', async () => {
      const segments = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.bar__segment',
      );
      segments[3].click();
      await fixture.whenStable();

      expect(texts(fixture, '.board__count')).toEqual(['0', '0', '1']);
    });

    it('filters to overdue tasks from the overdue statistic tile', async () => {
      const tiles = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.stat__button',
      );
      tiles[1].click();
      await fixture.whenStable();

      expect(texts(fixture, '.board__count')).toEqual(['1', '0', '0']);
      expect(tiles[1].getAttribute('aria-pressed')).toBe('true');
    });

    it('clears the filter when the active tile is pressed again', async () => {
      const tiles = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.stat__button',
      );
      tiles[1].click();
      await fixture.whenStable();
      tiles[1].click();
      await fixture.whenStable();

      expect(texts(fixture, '.board__count')).toEqual(['2', '1', '1']);
    });

    it('never renders the totals tile as active, since it is the default state', async () => {
      const tiles = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.stat__button',
      );

      expect(tiles[0].getAttribute('aria-pressed')).toBe('false');
    });

    it('shows the filtered empty state and can clear from it', async () => {
      // Search lives in the shell's top bar, so it is applied through the store
      // the same way the shell applies it.
      TestBed.inject(TaskStore).setSearch('nothing matches this');
      await fixture.whenStable();

      expect(text(fixture, 'app-empty-state')).toContain('No tasks match your filters');

      await click(fixture, 'app-empty-state button');

      expect(texts(fixture, '.board__count')).toEqual(['2', '1', '1']);
    });
  });

  describe('deleting a task', () => {
    it('asks for confirmation before deleting', async () => {
      await click(fixture, 'app-task-card .card__menu');
      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items[items.length - 1].click();
      await fixture.whenStable();

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.objectContaining({ destructive: true, confirmLabel: 'Delete' }),
      );

      await flushWrites();
    });

    it('removes the card and confirms with a snackbar', async () => {
      await click(fixture, 'app-task-card .card__menu');
      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items[items.length - 1].click();
      await fixture.whenStable();
      await flushWrites();

      expect(snackBarSpy).toHaveBeenCalledWith('Task deleted', 'Dismiss', expect.anything());
    });

    it('leaves the board untouched when the confirmation is declined', async () => {
      confirmSpy.mockResolvedValue(false);

      await click(fixture, 'app-task-card .card__menu');
      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items[items.length - 1].click();
      await fixture.whenStable();

      expect(texts(fixture, '.board__count')).toEqual(['2', '1', '1']);
      expect(snackBarSpy).not.toHaveBeenCalled();
    });
  });

  describe('moving a task', () => {
    it('moves the card between columns and writes the change', async () => {
      const board = (fixture.nativeElement as HTMLElement).querySelector('app-task-board');
      expect(board).not.toBeNull();

      await click(fixture, 'app-task-card .card__menu');
      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items.find((node) => node.textContent?.includes('Move to Done'))?.click();
      await fixture.whenStable();

      const writes = httpBackend().match((request) => request.method === 'PATCH');
      expect(writes).toHaveLength(1);
      expect(writes[0].request.body).toMatchObject({ status: 'done' });

      await flushWrites(createTask({ id: 'task-a', status: 'done' }));
    });
  });

  describe('navigation', () => {
    it('routes to the composer from the primary action', async () => {
      const router = TestBed.inject(Router);
      const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

      await click(fixture, '.bar__create');

      expect(navigate).toHaveBeenCalledWith(['/tasks/new']);
    });
  });

  describe('error handling', () => {
    it('surfaces a failed write in a snackbar rather than in the page body', async () => {
      await click(fixture, 'app-task-card .card__menu');
      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items[items.length - 1].click();
      await fixture.whenStable();

      await flushWrites('nope', 500);

      expect(snackBarSpy).toHaveBeenCalledWith(
        expect.stringContaining('Something went wrong'),
        'Dismiss',
        expect.anything(),
      );
      expect(texts(fixture, '.board__count')).toEqual(['2', '1', '1']);
    });
  });
});
