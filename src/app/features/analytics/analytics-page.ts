import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ChartConfiguration } from 'chart.js';
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL_KEYS,
  TASK_STATUSES,
  TASK_STATUS_LABEL_KEYS,
} from '../../core/interfaces';
import { TaskStore } from '../../core/state/task-store';
import { UserStore } from '../../core/state/user-store';
import { ChartCanvas } from '../../shared/components/chart/chart';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Skeleton } from '../../shared/components/skeleton/skeleton';

/**
 * Palette per series, taken from the design tokens rather than Chart.js
 * defaults, so the charts read as part of the same product.
 */
const STATUS_COLORS: Readonly<Record<string, string>> = {
  todo: '#94A3B8',
  in_progress: '#2563EB',
  done: '#067647',
};

const PRIORITY_COLORS: Readonly<Record<string, string>> = {
  high: '#D32F2F',
  medium: '#EF8C00',
  low: '#64748B',
};

const GRID_COLOR = 'rgba(16, 24, 40, 0.06)';
const LABEL_COLOR = '#667085';

/**
 * Analytics.
 *
 * Every figure is derived from the tasks the client already holds, so the charts
 * cannot disagree with the board — and the page needs no extra endpoint.
 */
@Component({
  selector: 'app-analytics-page',
  imports: [
    ChartCanvas,
    EmptyState,
    ErrorState,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    Skeleton,
    TranslatePipe,
  ],
  templateUrl: './analytics-page.html',
  styleUrl: './analytics-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {
  private readonly tasks = inject(TaskStore);
  private readonly users = inject(UserStore);
  private readonly translate = inject(TranslateService);

  protected readonly loading = this.tasks.isLoading;
  protected readonly loadError = this.tasks.loadError;
  protected readonly totals = this.tasks.totals;

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  protected readonly isEmpty = computed(() => this.totals().total === 0);

  protected readonly summary = computed(() => {
    this.languageRevision();
    const totals = this.totals();

    return this.translate.instant('analytics.summary', {
      total: totals.total,
      rate: totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100),
    }) as string;
  });

  /** Doughnut: how the working set splits across the three columns. */
  protected readonly statusChart = computed<ChartConfiguration>(() => {
    this.languageRevision();
    const totals = this.totals();
    const values = [totals.todo, totals.inProgress, totals.done];

    return {
      type: 'doughnut',
      data: {
        labels: TASK_STATUSES.map(
          (status) => this.translate.instant(TASK_STATUS_LABEL_KEYS[status]) as string,
        ),
        datasets: [
          {
            data: values,
            backgroundColor: TASK_STATUSES.map((status) => STATUS_COLORS[status]),
            borderWidth: 0,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: { position: 'bottom', labels: { color: LABEL_COLOR, boxWidth: 10, padding: 16 } },
        },
      },
    };
  });

  /** Bars: how much of the backlog is urgent. */
  protected readonly priorityChart = computed<ChartConfiguration>(() => {
    this.languageRevision();
    const totals = this.totals();
    const values = [totals.highPriority, totals.mediumPriority, totals.lowPriority];

    return {
      type: 'bar',
      data: {
        labels: TASK_PRIORITIES.map(
          (priority) => this.translate.instant(TASK_PRIORITY_LABEL_KEYS[priority]) as string,
        ),
        datasets: [
          {
            data: values,
            backgroundColor: TASK_PRIORITIES.map((priority) => PRIORITY_COLORS[priority]),
            borderRadius: 6,
            barThickness: 34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: LABEL_COLOR } },
          y: {
            beginAtZero: true,
            grid: { color: GRID_COLOR },
            // Task counts are whole numbers, so fractional ticks are noise.
            ticks: { color: LABEL_COLOR, precision: 0 },
          },
        },
      },
    };
  });

  /** Stacked bars: who is carrying what, and how much of it is late. */
  protected readonly workloadChart = computed<ChartConfiguration>(() => {
    this.languageRevision();
    const workloads = this.users.workloads().filter((user) => user.totalTasks > 0);

    return {
      type: 'bar',
      data: {
        labels: workloads.map((user) => user.name.split(' ')[0]),
        datasets: [
          {
            label: this.translate.instant(TASK_STATUS_LABEL_KEYS.todo) as string,
            data: workloads.map((user) => user.todoTasks),
            backgroundColor: STATUS_COLORS['todo'],
            borderRadius: 4,
          },
          {
            label: this.translate.instant(TASK_STATUS_LABEL_KEYS.in_progress) as string,
            data: workloads.map((user) => user.inProgressTasks),
            backgroundColor: STATUS_COLORS['in_progress'],
            borderRadius: 4,
          },
          {
            label: this.translate.instant(TASK_STATUS_LABEL_KEYS.done) as string,
            data: workloads.map((user) => user.doneTasks),
            backgroundColor: STATUS_COLORS['done'],
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { color: LABEL_COLOR, boxWidth: 10, padding: 16 } },
        },
        scales: {
          x: { stacked: true, grid: { display: false }, ticks: { color: LABEL_COLOR } },
          y: {
            stacked: true,
            beginAtZero: true,
            grid: { color: GRID_COLOR },
            ticks: { color: LABEL_COLOR, precision: 0 },
          },
        },
      },
    };
  });

  /** Text alternatives, since a canvas conveys nothing on its own. */
  protected readonly statusChartLabel = computed(() => {
    this.languageRevision();
    const totals = this.totals();

    return this.translate.instant('analytics.statusChartLabel', {
      todo: totals.todo,
      inProgress: totals.inProgress,
      done: totals.done,
    }) as string;
  });

  protected readonly priorityChartLabel = computed(() => {
    this.languageRevision();
    const totals = this.totals();

    return this.translate.instant('analytics.priorityChartLabel', {
      high: totals.highPriority,
      medium: totals.mediumPriority,
      low: totals.lowPriority,
    }) as string;
  });

  protected readonly workloadChartLabel = computed(() => {
    this.languageRevision();

    return this.translate.instant('analytics.workloadChartLabel', {
      count: this.users.workloads().filter((user) => user.totalTasks > 0).length,
    }) as string;
  });

  protected onReload(): void {
    this.tasks.reload();
  }
}
