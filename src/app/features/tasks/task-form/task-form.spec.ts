import { provideNativeDateAdapter } from '@angular/material/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text, texts } from '../../../../testing/component-helpers';
import { createTask, createUser, TEST_NOW } from '../../../../testing/task.factory';
import { provideFrozenClock } from '../../../../testing/test-helpers';
import { Task, TaskDraft, TaskView, User } from '../../../core/interfaces';
import { toApiDateString } from '../../../core/utils/date.utils';
import { toTaskView } from '../../../core/utils/task.utils';
import { provideAppIcons } from '../../../shared/icons/provide-icons';
import { TaskForm } from './task-form';

const USERS: User[] = [
  createUser({ id: 'user-001', name: 'John Doe' }),
  createUser({ id: 'user-002', name: 'Sarah Smith' }),
];

function view(overrides: Partial<Task> = {}): TaskView {
  return toTaskView(createTask(overrides), TEST_NOW);
}

/** A date offset from the frozen clock, as the datepicker would supply it. */
function dateOffset(days: number): Date {
  const date = new Date(TEST_NOW);
  date.setDate(date.getDate() + days);
  return date;
}

describe('TaskForm', () => {
  let fixture: ComponentFixture<TaskForm>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TaskForm],
      providers: [provideAppIcons(), provideFrozenClock(), provideNativeDateAdapter()],
    });

    fixture = TestBed.createComponent(TaskForm);
    fixture.componentRef.setInput('assignees', USERS);
    await fixture.whenStable();
  });

  afterEach(() => {
    for (const container of document.querySelectorAll('.cdk-overlay-container')) {
      container.remove();
    }
  });

  /** The typed form, reached the way a spec should rather than through the DOM. */
  function form(): TaskForm['form'] {
    return fixture.componentInstance['form'];
  }

  async function setValue(patch: Record<string, unknown>): Promise<void> {
    form().patchValue(patch);
    await fixture.whenStable();
  }

  /** Fills every required field with something valid. */
  async function fillValid(): Promise<void> {
    await setValue({
      title: 'Wire the analytics charts',
      description: 'Render distribution by priority and by status using Chart.js.',
      status: 'todo',
      priority: 'medium',
      dueDate: dateOffset(5),
      assigneeId: 'user-002',
    });
  }

  describe('composing', () => {
    it('opens with sensible defaults rather than an empty invalid form', () => {
      expect(form().controls.status.value).toBe('todo');
      expect(form().controls.priority.value).toBe('medium');
      // Pre-selecting the first assignee saves a click in the common case.
      expect(form().controls.assigneeId.value).toBe('user-001');
    });

    it('labels the submit action for creating', () => {
      expect(text(fixture, 'button[type="submit"]')).toBe('Create task');
    });

    it('starts pristine, so a cancel needs no confirmation', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('editing', () => {
    beforeEach(async () => {
      fixture.componentRef.setInput(
        'task',
        view({
          title: 'Design new homepage layout',
          description: 'Create wireframes and mockups for the redesign.',
          status: 'in_progress',
          priority: 'high',
          assignee: { id: 'user-002', name: 'Sarah Smith', avatar: 'SS', email: 's@c.com' },
          tags: ['Design', 'Frontend'],
        }),
      );
      await fixture.whenStable();
    });

    it('prefills every field from the task', () => {
      const value = form().getRawValue();

      expect(value.title).toBe('Design new homepage layout');
      expect(value.status).toBe('in_progress');
      expect(value.priority).toBe('high');
      expect(value.assigneeId).toBe('user-002');
    });

    it('rebuilds one tag control per existing tag', () => {
      expect(form().controls.tags.length).toBe(2);
      expect(form().controls.tags.getRawValue()).toEqual(['Design', 'Frontend']);
    });

    it('labels the submit action for saving', () => {
      expect(text(fixture, 'button[type="submit"]')).toBe('Save changes');
    });

    it('is pristine on open, so opening and closing prompts nothing', () => {
      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('validation', () => {
    it('does not emit an invalid form, and reveals every failure at once', async () => {
      const spy = vi.fn();
      fixture.componentInstance.save.subscribe(spy);

      await click(fixture, 'button[type="submit"]');

      expect(spy).not.toHaveBeenCalled();
      // Title and description are the two required text fields; the selects
      // already hold valid defaults.
      expect(texts(fixture, '.field-error').length).toBeGreaterThanOrEqual(2);
    });

    it('rejects a title of only spaces', async () => {
      await setValue({ title: '     ' });

      expect(form().controls.title.hasError('notBlank')).toBe(true);
    });

    it('rejects a due date in the past', async () => {
      await setValue({ dueDate: dateOffset(-2) });

      expect(form().controls.dueDate.hasError('dueDateInPast')).toBe(true);
    });

    it('requires a due date once the priority is high', async () => {
      await fillValid();
      await setValue({ priority: 'high', dueDate: null });

      expect(form().hasError('highPriorityNeedsDueDate')).toBe(true);
    });

    it('shows the cross-field failure after a submit attempt', async () => {
      await fillValid();
      await setValue({ priority: 'high', dueDate: null });

      await click(fixture, 'button[type="submit"]');

      expect(text(fixture, '.form__error')).toBe('A high-priority task needs a due date.');
    });

    it('rejects a done task due in the future', async () => {
      await fillValid();
      await setValue({ status: 'done', dueDate: dateOffset(10) });

      expect(form().hasError('doneCannotBeDueLater')).toBe(true);
    });
  });

  describe('dynamic tag controls', () => {
    it('starts with none and adds one at a time', async () => {
      expect(form().controls.tags.length).toBe(0);

      await click(fixture, '.form__tag-add');
      expect(form().controls.tags.length).toBe(1);

      await click(fixture, '.form__tag-add');
      expect(form().controls.tags.length).toBe(2);
    });

    it('removes the row the user asked to remove', async () => {
      await click(fixture, '.form__tag-add');
      await click(fixture, '.form__tag-add');
      form().controls.tags.setValue(['first', 'second']);
      await fixture.whenStable();

      await click(fixture, '.form__tag-remove');

      expect(form().controls.tags.getRawValue()).toEqual(['second']);
    });

    it('stops at the maximum and disables the add action', async () => {
      for (let index = 0; index < 8; index += 1) {
        fixture.componentInstance['addTag'](`tag-${index}`);
      }
      await fixture.whenStable();

      expect(form().controls.tags.length).toBe(6);
      expect(query<HTMLButtonElement>(fixture, '.form__tag-add').disabled).toBe(true);
    });

    it('rejects duplicate tags, case-insensitively', async () => {
      fixture.componentInstance['addTag']('Design');
      fixture.componentInstance['addTag']('design');
      await fixture.whenStable();

      expect(form().controls.tags.hasError('duplicateTags')).toBe(true);
    });

    it('marks the form dirty when a tag row is added', async () => {
      await click(fixture, '.form__tag-add');

      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
    });
  });

  describe('submitting', () => {
    it('emits a trimmed draft with the resolved assignee', async () => {
      await fillValid();
      await setValue({ title: '  Padded title  ' });
      fixture.componentInstance['addTag']('  Analytics  ');
      await fixture.whenStable();

      const spy = vi.fn<(draft: TaskDraft) => void>();
      fixture.componentInstance.save.subscribe(spy);

      await click(fixture, 'button[type="submit"]');

      expect(spy).toHaveBeenCalledTimes(1);
      const draft = spy.mock.calls[0][0];

      expect(draft.title).toBe('Padded title');
      expect(draft.tags).toEqual(['Analytics']);
      expect(draft.assignee).toMatchObject({ id: 'user-002', name: 'Sarah Smith' });
      expect(draft.dueDate).toBe(toApiDateString(dateOffset(5)));
    });

    it('drops blank tag rows rather than saving empty strings', async () => {
      await fillValid();
      fixture.componentInstance['addTag']('');
      fixture.componentInstance['addTag']('Real');
      await fixture.whenStable();

      const spy = vi.fn<(draft: TaskDraft) => void>();
      fixture.componentInstance.save.subscribe(spy);

      await click(fixture, 'button[type="submit"]');

      expect(spy.mock.calls[0][0].tags).toEqual(['Real']);
    });

    it('defaults a missing due date to today, keeping downstream dates total', async () => {
      await fillValid();
      await setValue({ priority: 'low', dueDate: null });

      const spy = vi.fn<(draft: TaskDraft) => void>();
      fixture.componentInstance.save.subscribe(spy);

      await click(fixture, 'button[type="submit"]');

      expect(spy.mock.calls[0][0].dueDate).toBe(toApiDateString(TEST_NOW));
    });

    it('emits cancelled without validating', async () => {
      const spy = vi.fn();
      fixture.componentInstance.cancelled.subscribe(spy);

      await click(fixture, '.form__actions button[type="button"]');

      expect(spy).toHaveBeenCalled();
    });
  });

  describe('saving state', () => {
    it('disables the whole form, which also blocks enter-to-submit', async () => {
      fixture.componentRef.setInput('saving', true);
      await fixture.whenStable();

      expect(form().disabled).toBe(true);
      expect(query<HTMLButtonElement>(fixture, 'button[type="submit"]').disabled).toBe(true);
    });

    it('re-enables once saving finishes', async () => {
      fixture.componentRef.setInput('saving', true);
      await fixture.whenStable();
      fixture.componentRef.setInput('saving', false);
      await fixture.whenStable();

      expect(form().disabled).toBe(false);
    });

    it('reports no unsaved changes while saving, so closing does not prompt', async () => {
      await setValue({ title: 'Edited' });
      fixture.componentRef.setInput('saving', true);
      await fixture.whenStable();

      expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
    });
  });

  describe('accessibility', () => {
    it('gives every tag remove button a distinct label', async () => {
      await click(fixture, '.form__tag-add');
      await click(fixture, '.form__tag-add');

      const labels = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('.form__tag-remove'),
      ].map((button) => button.getAttribute('aria-label'));

      expect(labels).toEqual(['Remove tag 1', 'Remove tag 2']);
    });

    it('announces validation messages as alerts', async () => {
      await click(fixture, 'button[type="submit"]');

      expect(exists(fixture, '.field-error[role="alert"]')).toBe(true);
    });
  });
});
