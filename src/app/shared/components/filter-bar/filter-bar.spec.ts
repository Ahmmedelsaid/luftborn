import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideTestTranslate, useTranslations } from '../../../../testing/translate-helpers';
import { click, exists, texts } from '../../../../testing/component-helpers';
import { createUser } from '../../../../testing/task.factory';
import { TaskPriority, TaskStatus, User } from '../../../core/interfaces';
import { provideAppIcons } from '../../icons/provide-icons';
import { FilterBar } from './filter-bar';

describe('FilterBar', () => {
  let fixture: ComponentFixture<FilterBar>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FilterBar],
      providers: [provideAppIcons(), provideTestTranslate()],
    });
    useTranslations();
    fixture = TestBed.createComponent(FilterBar);
  });

  async function render(inputs?: {
    activeStatus?: TaskStatus | null;
    activePriorities?: TaskPriority[];
    activeAssigneeIds?: string[];
    assignees?: User[];
  }): Promise<void> {
    if (inputs?.activeStatus !== undefined) {
      fixture.componentRef.setInput('activeStatus', inputs.activeStatus);
    }
    if (inputs?.activePriorities) {
      fixture.componentRef.setInput('activePriorities', inputs.activePriorities);
    }
    if (inputs?.activeAssigneeIds) {
      fixture.componentRef.setInput('activeAssigneeIds', inputs.activeAssigneeIds);
    }
    if (inputs?.assignees) {
      fixture.componentRef.setInput('assignees', inputs.assignees);
    }

    await fixture.whenStable();
  }

  describe('status segments', () => {
    it('offers All plus every status, in canonical order', async () => {
      await render();

      expect(texts(fixture, '.bar__segment')).toEqual(['All', 'To Do', 'In Progress', 'Done']);
    });

    it('marks All as selected when no status filter is applied', async () => {
      await render({ activeStatus: null });

      const segments = (fixture.nativeElement as HTMLElement).querySelectorAll('.bar__segment');

      expect(segments[0].getAttribute('aria-selected')).toBe('true');
      expect(segments[1].getAttribute('aria-selected')).toBe('false');
    });

    it('marks the active status as selected', async () => {
      await render({ activeStatus: 'in_progress' });

      const segments = (fixture.nativeElement as HTMLElement).querySelectorAll('.bar__segment');

      expect(segments[2].getAttribute('aria-selected')).toBe('true');
    });

    it('emits null when All is chosen, which clears the filter', async () => {
      await render({ activeStatus: 'done' });

      const spy = vi.fn();
      fixture.componentInstance.statusChange.subscribe(spy);

      await click(fixture, '.bar__segment');

      expect(spy).toHaveBeenCalledWith(null);
    });

    it('emits the chosen status', async () => {
      await render();

      const spy = vi.fn();
      fixture.componentInstance.statusChange.subscribe(spy);

      const segments = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.bar__segment',
      );
      segments[1].click();
      await fixture.whenStable();

      expect(spy).toHaveBeenCalledWith('todo');
    });
  });

  describe('priority filter', () => {
    it('reads "Priority" when nothing is selected', async () => {
      await render();

      expect(texts(fixture, '.bar__dropdown')).toContain('Priority');
    });

    it('names the single selected priority', async () => {
      await render({ activePriorities: ['high'] });

      expect(fixture.componentInstance['priorityLabel']()).toBe('High');
    });

    it('counts multiple selected priorities', async () => {
      await render({ activePriorities: ['high', 'low'] });

      expect(fixture.componentInstance['priorityLabel']()).toBe('Priority (2)');
    });

    it('emits a toggle for the chosen priority', async () => {
      await render();

      const spy = vi.fn();
      fixture.componentInstance.priorityToggle.subscribe(spy);

      const triggers = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.bar__dropdown',
      );
      triggers[triggers.length - 1].click();
      await fixture.whenStable();

      const items = [...document.querySelectorAll<HTMLElement>('.mat-mdc-menu-item')];
      items[0].click();
      await fixture.whenStable();

      expect(spy).toHaveBeenCalledWith('high');
    });
  });

  describe('assignee filter', () => {
    it('is hidden when there are no assignees to choose from', async () => {
      await render({ assignees: [] });

      expect(fixture.componentInstance['assigneeLabel']()).toBe('Assignee');
      expect(texts(fixture, '.bar__dropdown')).toEqual(['Priority']);
    });

    it('names the single selected assignee by first name', async () => {
      await render({
        assignees: [createUser({ id: 'u1', name: 'Sarah Smith' })],
        activeAssigneeIds: ['u1'],
      });

      expect(fixture.componentInstance['assigneeLabel']()).toBe('Sarah');
    });

    it('summarises multiple selected assignees', async () => {
      await render({
        assignees: [createUser({ id: 'u1', name: 'Sarah Smith' }), createUser({ id: 'u2' })],
        activeAssigneeIds: ['u1', 'u2'],
      });

      expect(fixture.componentInstance['assigneeLabel']()).toBe('Sarah +1');
    });
  });

  describe('clear action', () => {
    it('is hidden when no filters are applied', async () => {
      await render();

      expect(exists(fixture, '.bar__clear')).toBe(false);
    });

    it('appears once a filter is applied', async () => {
      await render({ activePriorities: ['high'] });

      expect(exists(fixture, '.bar__clear')).toBe(true);
    });

    it('emits clearFilters', async () => {
      await render({ activePriorities: ['high'] });

      const spy = vi.fn();
      fixture.componentInstance.clearFilters.subscribe(spy);

      await click(fixture, '.bar__clear');

      expect(spy).toHaveBeenCalled();
    });
  });

  it('emits createTask from the primary action', async () => {
    await render();

    const spy = vi.fn();
    fixture.componentInstance.createTask.subscribe(spy);

    await click(fixture, '.bar__create');

    expect(spy).toHaveBeenCalled();
  });
});
