import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { exists, text, texts } from '../../../testing/component-helpers';
import { createTask, createUser, dateOffsetFromNow } from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { ChartStub } from '../../../testing/chart-stub';
import { provideTestTranslate, useTranslations } from '../../../testing/translate-helpers';
import { Task } from '../../core/interfaces';
import { ChartCanvas } from '../../shared/components/chart/chart';
import { provideAppIcons } from '../../shared/icons/provide-icons';
import { AnalyticsPage } from './analytics-page';

const TASKS: Task[] = [
  createTask({ id: 'a', status: 'todo', priority: 'high', dueDate: dateOffsetFromNow(-2) }),
  createTask({ id: 'b', status: 'todo', priority: 'medium' }),
  createTask({ id: 'c', status: 'in_progress', priority: 'high' }),
  createTask({ id: 'd', status: 'done', priority: 'low' }),
];

describe('AnalyticsPage', () => {
  let fixture: ComponentFixture<AnalyticsPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [
        provideTestHttpWithErrorNormalisation(),
        provideFrozenClock(),
        provideAppIcons(),
        provideTestTranslate(),
      ],
    });
    // The override has to precede any `inject`, so it comes before the bundles
    // are loaded. Chart.js cannot measure a canvas under jsdom, so the wrapper
    // is swapped for a stub that records the configuration the page derived.
    TestBed.overrideComponent(AnalyticsPage, {
      remove: { imports: [ChartCanvas] },
      add: { imports: [ChartStub] },
    });

    useTranslations();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  /** Boots the page and answers the collections it pulls. */
  async function render(tasks: Task[] = TASKS): Promise<void> {
    fixture = TestBed.createComponent(AnalyticsPage);
    await settle();

    const backend = httpBackend();
    backend.match((request) => request.url.endsWith('/tasks')).forEach((r) => r.flush(tasks));
    backend
      .match((request) => request.url.endsWith('/users'))
      .forEach((r) => r.flush([createUser({ id: 'user-001', name: 'John Doe' })]));
    backend.match(() => true).forEach((r) => r.flush([]));

    await settle();
    await fixture.whenStable();
  }

  it('renders three chart panels', async () => {
    await render();

    expect(texts(fixture, '.analytics__panel-title')).toEqual([
      'Tasks by status',
      'Tasks by priority',
      'Workload by assignee',
    ]);
  });

  it('summarises the total and the completion rate', async () => {
    await render();

    // One of four tasks is done.
    expect(text(fixture, '.header__subtitle')).toBe('4 tasks · 25% complete');
  });

  it('derives the status breakdown from the loaded tasks', async () => {
    await render();

    const data = fixture.componentInstance['statusChart']().data.datasets[0].data;

    expect(data).toEqual([2, 1, 1]);
  });

  it('derives the priority breakdown from the loaded tasks', async () => {
    await render();

    const data = fixture.componentInstance['priorityChart']().data.datasets[0].data;

    expect(data).toEqual([2, 1, 1]);
  });

  it('labels the status chart for assistive technology', async () => {
    await render();

    expect(fixture.componentInstance['statusChartLabel']()).toBe(
      'Doughnut chart: 2 to do, 1 in progress, 1 done.',
    );
  });

  it('translates the chart series labels', async () => {
    await render();

    expect(fixture.componentInstance['statusChart']().data.labels).toEqual([
      'To Do',
      'In Progress',
      'Done',
    ]);
  });

  it('stacks one dataset per status in the workload chart', async () => {
    await render();

    const datasets = fixture.componentInstance['workloadChart']().data.datasets;

    expect(datasets).toHaveLength(3);
    expect(datasets.map((set) => set.label)).toEqual(['To Do', 'In Progress', 'Done']);
  });

  it('explains an empty dataset instead of drawing empty charts', async () => {
    await render([]);

    expect(text(fixture, 'app-empty-state')).toContain('Nothing to chart yet');
    expect(exists(fixture, 'app-chart')).toBe(false);
  });

  it('reports a zero completion rate without dividing by zero', async () => {
    await render([]);

    expect(text(fixture, '.header__subtitle')).toBe('0 tasks · 0% complete');
  });

  it('surfaces a load failure with a retry', async () => {
    fixture = TestBed.createComponent(AnalyticsPage);
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
