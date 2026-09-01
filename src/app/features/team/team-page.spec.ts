import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { click, exists, query, text, texts } from '../../../testing/component-helpers';
import { createTask, createUser, dateOffsetFromNow } from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { Task, User } from '../../core/interfaces';
import { TaskStore } from '../../core/state/task-store';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { TeamPage } from './team-page';

const ALICE = createUser({ id: 'user-001', name: 'Alice Adams', email: 'alice@company.com' });
const BOB = createUser({ id: 'user-002', name: 'Bob Brown', email: 'bob@company.com' });

const USERS: User[] = [ALICE, BOB];

const TASKS: Task[] = [
  createTask({ id: 'a', status: 'done', assignee: { ...ALICE } }),
  createTask({ id: 'b', status: 'todo', assignee: { ...ALICE } }),
  createTask({ id: 'c', status: 'in_progress', assignee: { ...ALICE } }),
  createTask({
    id: 'd',
    status: 'todo',
    assignee: { ...ALICE },
    dueDate: dateOffsetFromNow(-3),
  }),
  createTask({ id: 'e', status: 'todo', assignee: { ...BOB } }),
];

describe('TeamPage', () => {
  let fixture: ComponentFixture<TeamPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TeamPage],
      providers: [
        provideTestHttpWithErrorNormalisation(),
        provideFrozenClock(),
        provideAppIcons(),
        provideTestTranslate(),
        provideRouter([{ path: 'tasks', children: [] }]),
      ],
    });
    useTranslations();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  async function render(users: User[] = USERS, tasks: Task[] = TASKS): Promise<void> {
    fixture = TestBed.createComponent(TeamPage);
    await settle();

    const backend = httpBackend();
    backend.match((request) => request.url.endsWith('/users')).forEach((r) => r.flush(users));
    backend.match((request) => request.url.endsWith('/tasks')).forEach((r) => r.flush(tasks));
    backend.match(() => true).forEach((r) => r.flush([]));

    await settle();
    await fixture.whenStable();
  }

  it('renders a card per member, busiest first', async () => {
    await render();

    expect(texts(fixture, '.team__name')).toEqual(['Alice Adams', 'Bob Brown']);
  });

  it('summarises the team size and the assigned total', async () => {
    await render();

    expect(text(fixture, '.header__subtitle')).toBe('2 members · 5 tasks assigned');
  });

  it('shows counts derived from the loaded tasks, not from the api', async () => {
    await render();

    const first = (fixture.nativeElement as HTMLElement).querySelector('.team__card');
    const counts = [...(first?.querySelectorAll('.team__stat dd') ?? [])].map((node) =>
      node.textContent?.trim(),
    );

    // Alice: 2 to do, 1 in progress, 1 done, 1 overdue.
    expect(counts).toEqual(['2', '1', '1', '1']);
  });

  it('computes a completion rate and exposes it as a progress bar', async () => {
    await render();

    const bar = query(fixture, '.team__bar');

    // Alice has one of four done.
    expect(bar.getAttribute('aria-valuenow')).toBe('25');
    expect(bar.getAttribute('aria-label')).toBe('Completion rate for Alice Adams');
  });

  it('flags only the busiest member', async () => {
    await render();

    expect(texts(fixture, '.team__flag')).toEqual(['Busiest']);
  });

  it('filters the board to a member and navigates there', async () => {
    await render();

    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const tasks = TestBed.inject(TaskStore);

    await click(fixture, '.team__action');

    expect(tasks.filters().assigneeIds).toEqual(['user-001']);
    expect(navigate).toHaveBeenCalledWith(['/tasks']);
  });

  it('clears any previous filter before applying the member filter', async () => {
    await render();

    const tasks = TestBed.inject(TaskStore);
    tasks.patchFilters({ priorities: ['high'], search: 'stale' });

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await click(fixture, '.team__action');

    expect(tasks.filters().priorities).toEqual([]);
    expect(tasks.filters().search).toBe('');
  });

  it('explains an empty team rather than rendering nothing', async () => {
    await render([], []);

    expect(text(fixture, 'app-empty-state')).toContain('No team members yet');
  });

  it('gives an unassigned member a zero rate without dividing by zero', async () => {
    await render([BOB], []);

    expect(query(fixture, '.team__bar').getAttribute('aria-valuenow')).toBe('0');
  });

  it('surfaces a load failure with a retry', async () => {
    fixture = TestBed.createComponent(TeamPage);
    await settle();

    httpBackend()
      .match((request) => request.url.endsWith('/users'))
      .forEach((r) => r.flush('down', { status: 503, statusText: 'Unavailable' }));
    httpBackend()
      .match(() => true)
      .forEach((r) => r.flush([]));
    await settle();
    await fixture.whenStable();

    expect(exists(fixture, 'app-error-state')).toBe(true);
  });
});
