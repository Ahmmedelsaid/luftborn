import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text } from '../../../../testing/component-helpers';
import { createTask, dateOffsetFromNow, TEST_NOW } from '../../../../testing/task.factory';
import { Task, TaskStatus, TaskView } from '../../../core/interfaces';
import { toTaskView } from '../../../core/utils/task.utils';
import { TaskCard } from './task-card';

function view(overrides: Partial<Task> = {}): TaskView {
  return toTaskView(createTask(overrides), TEST_NOW);
}

describe('TaskCard', () => {
  let fixture: ComponentFixture<TaskCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TaskCard] });
    fixture = TestBed.createComponent(TaskCard);
  });

  async function render(
    task: TaskView,
    extra?: { pending?: boolean; moveTargets?: TaskStatus[] },
  ): Promise<void> {
    fixture.componentRef.setInput('task', task);

    if (extra?.pending !== undefined) {
      fixture.componentRef.setInput('pending', extra.pending);
    }
    if (extra?.moveTargets) {
      fixture.componentRef.setInput('moveTargets', extra.moveTargets);
    }

    await fixture.whenStable();
  }

  describe('content', () => {
    it('renders the title, description and tags', async () => {
      await render(
        view({ title: 'Ship the board', description: 'With drag and drop', tags: ['UI', 'Board'] }),
      );

      expect(text(fixture, '.card__title')).toBe('Ship the board');
      expect(text(fixture, '.card__description')).toBe('With drag and drop');
      expect(text(fixture, '.card__tags')).toBe('UI, Board');
    });

    it('omits the tag line when a task has no tags', async () => {
      await render(view({ tags: [] }));

      expect(exists(fixture, '.card__tags')).toBe(false);
    });

    it('renders the priority badge', async () => {
      await render(view({ priority: 'medium' }));

      expect(text(fixture, 'app-priority-badge')).toBe('Medium');
    });

    it('shortens the assignee to a first-name handle, as the design does', async () => {
      await render(
        view({ assignee: { id: 'u', name: 'Sarah Smith', avatar: 'SS', email: 'a@b.c' } }),
      );

      expect(text(fixture, '.card__handle')).toBe('@Sarah');
    });
  });

  describe('due-date state', () => {
    it('marks an overdue task and shows how late it is', async () => {
      await render(view({ status: 'todo', dueDate: dateOffsetFromNow(-3) }));

      const host = fixture.nativeElement as HTMLElement;

      expect(host.classList.contains('card--overdue')).toBe(true);
      expect(text(fixture, '.card__due')).toBe('Overdue by 3 days');
      expect(exists(fixture, '.card__due--overdue')).toBe(true);
    });

    it('shows a completion label for a done task instead of a due date', async () => {
      await render(
        view({
          status: 'done',
          dueDate: dateOffsetFromNow(-5),
          completedAt: TEST_NOW.toISOString(),
        }),
      );

      const host = fixture.nativeElement as HTMLElement;

      expect(host.classList.contains('card--done')).toBe(true);
      expect(host.classList.contains('card--overdue')).toBe(false);
      expect(text(fixture, '.card__due')).toBe('Completed today');
    });

    it('shows an upcoming due date neutrally', async () => {
      await render(view({ dueDate: dateOffsetFromNow(5) }));

      expect(text(fixture, '.card__due')).toBe('Due in 5 days');
      expect(exists(fixture, '.card__due--upcoming')).toBe(true);
    });
  });

  describe('pending state', () => {
    it('marks itself busy while a mutation is in flight', async () => {
      await render(view(), { pending: true });

      const host = fixture.nativeElement as HTMLElement;

      expect(host.classList.contains('card--pending')).toBe(true);
      expect(host.getAttribute('aria-busy')).toBe('true');
    });

    it('is not busy by default', async () => {
      await render(view());

      expect((fixture.nativeElement as HTMLElement).getAttribute('aria-busy')).toBeNull();
    });
  });

  describe('outputs', () => {
    it('emits open when the body is activated', async () => {
      const task = view({ id: 'task-042' });
      await render(task);

      const spy = vi.fn();
      fixture.componentInstance.open.subscribe(spy);

      await click(fixture, '.card__body');

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-042' }));
    });

    it('emits edit from the menu', async () => {
      await render(view({ id: 'task-042' }));

      const spy = vi.fn();
      fixture.componentInstance.edit.subscribe(spy);

      await click(fixture, '.card__menu');
      const items = document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item');
      items[0].click();
      await fixture.whenStable();

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'task-042' }));
    });

    it('offers a move target for each other status', async () => {
      await render(view({ status: 'todo' }), { moveTargets: ['in_progress', 'done'] });

      await click(fixture, '.card__menu');
      const labels = [...document.querySelectorAll('.mat-mdc-menu-item')].map((node) =>
        node.textContent?.trim(),
      );

      expect(labels).toContain('Move to In Progress');
      expect(labels).toContain('Move to Done');
    });

    it('emits the chosen status from a move action', async () => {
      await render(view({ status: 'todo' }), { moveTargets: ['done'] });

      const spy = vi.fn();
      fixture.componentInstance.moveTo.subscribe(spy);

      await click(fixture, '.card__menu');
      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items.find((node) => node.textContent?.includes('Move to Done'))?.click();
      await fixture.whenStable();

      expect(spy).toHaveBeenCalledWith('done');
    });
  });

  describe('accessibility', () => {
    it('labels the menu trigger with the task it belongs to', async () => {
      await render(view({ title: 'Ship the board' }));

      expect(query(fixture, '.card__menu').getAttribute('aria-label')).toBe(
        'Actions for Ship the board',
      );
    });
  });
});
