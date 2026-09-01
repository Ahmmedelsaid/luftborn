import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Statistic, TaskPriority, TaskStatus, TaskView } from '../../core/interfaces';
import { ActivityStore } from '../../core/state/activity-store';
import { StatisticStore } from '../../core/state/statistic-store';
import { TaskStore } from '../../core/state/task-store';
import { UserStore } from '../../core/state/user-store';
import { ActivityFeed } from '../../shared/components/activity-feed/activity-feed';
import { TaskBoard } from '../../shared/components/board/task-board';
import { TaskMove } from '../../shared/interfaces';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { FilterBar } from '../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { StatCard } from '../../shared/components/stat-card/stat-card';

/**
 * Dashboard container.
 *
 * Holds no state of its own: it reads from the stores, hands plain data to the
 * presentational components, and turns their events into store calls. Snackbars
 * and confirmation dialogs live here rather than in the stores, which is what
 * keeps the stores free of UI dependencies.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    ActivityFeed,
    ErrorState,
    FilterBar,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    Skeleton,
    StatCard,
    TaskBoard,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly tasks = inject(TaskStore);
  private readonly statistics = inject(StatisticStore);
  private readonly activity = inject(ActivityStore);
  private readonly users = inject(UserStore);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly statisticCards = this.statistics.statistics;
  protected readonly statisticsLoading = this.statistics.isLoading;
  protected readonly board = this.tasks.board;
  protected readonly boardLoading = this.tasks.isLoading;
  protected readonly loadError = this.tasks.loadError;
  protected readonly pendingIds = this.tasks.pendingIds;
  protected readonly hasFilters = this.tasks.hasActiveFilters;
  protected readonly filters = this.tasks.filters;
  protected readonly assignees = this.users.users;
  protected readonly activities = this.activity.activities;
  protected readonly activityLoading = this.activity.isLoading;

  /** The segmented control is single-select, so it shows the first status only. */
  protected readonly activeStatus = computed<TaskStatus | null>(
    () => this.filters().statuses[0] ?? null,
  );

  protected readonly summary = computed(() => {
    const totals = this.tasks.filteredTotals();
    return `${totals.total} tasks · ${totals.overdue} overdue`;
  });

  protected readonly statisticSkeletons = [0, 1, 2, 3];

  /** Which filter each statistic tile applies, keyed by its API id. */
  private readonly statisticFilters: Readonly<
    Record<string, { readonly status: TaskStatus | null; readonly overdueOnly: boolean }>
  > = {
    'stat-001': { status: null, overdueOnly: false },
    'stat-002': { status: 'done', overdueOnly: false },
    'stat-003': { status: 'in_progress', overdueOnly: false },
    'stat-004': { status: null, overdueOnly: true },
  };

  protected isStatisticActive(statistic: Statistic): boolean {
    const target = this.statisticFilters[statistic.id];

    // The totals tile maps to the neutral filter state, which is also the
    // default, so highlighting it would leave a tile permanently selected.
    if (!target || (!target.status && !target.overdueOnly)) {
      return false;
    }

    const filters = this.filters();
    const statusMatches = target.status
      ? filters.statuses.length === 1 && filters.statuses[0] === target.status
      : filters.statuses.length === 0;

    return statusMatches && filters.overdueOnly === target.overdueOnly;
  }

  protected isStatisticInteractive(statistic: Statistic): boolean {
    return statistic.id in this.statisticFilters;
  }

  /** Clicking an active tile clears its filter, so the tiles toggle. */
  protected onStatisticFilter(statistic: Statistic): void {
    const target = this.statisticFilters[statistic.id];

    if (!target) {
      return;
    }

    if (this.isStatisticActive(statistic)) {
      this.tasks.resetFilters();
      return;
    }

    this.tasks.patchFilters({
      statuses: target.status ? [target.status] : [],
      overdueOnly: target.overdueOnly,
    });
  }

  constructor() {
    // A failed write is transient and belongs in a snackbar, not in the page
    // body; the store only records it, so surfacing it is the container's job.
    effect(() => {
      const error = this.tasks.mutationError();

      if (!error) {
        return;
      }

      this.snackBar.open(error.message, 'Dismiss', { duration: 6000 });
      this.tasks.dismissError();
    });
  }

  protected onStatusChange(status: TaskStatus | null): void {
    this.tasks.setStatusFilter(status);
  }

  protected onPriorityToggle(priority: TaskPriority): void {
    const current = this.filters().priorities;
    const next = current.includes(priority)
      ? current.filter((value) => value !== priority)
      : [...current, priority];

    this.tasks.patchFilters({ priorities: next });
  }

  protected onAssigneeToggle(id: string): void {
    const current = this.filters().assigneeIds;
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];

    this.tasks.patchFilters({ assigneeIds: next });
  }

  protected onClearFilters(): void {
    this.tasks.resetFilters();
  }

  protected onReload(): void {
    this.tasks.reload();
    this.statistics.reload();
    this.activity.reload();
  }

  protected async onCreateTask(): Promise<void> {
    await this.router.navigate(['/tasks/new']);
  }

  protected async onEditTask(task: TaskView): Promise<void> {
    await this.router.navigate(['/tasks', task.id, 'edit']);
  }

  /** Opening a card is editing it, which is what the brief's modal edit means. */
  protected async onOpenTask(task: TaskView): Promise<void> {
    await this.router.navigate(['/tasks', task.id, 'edit']);
  }

  protected onTaskMoved(move: TaskMove): void {
    void this.tasks.move(move.taskId, move.toStatus, move.toIndex);
  }

  protected async onDeleteTask(task: TaskView): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Delete task?',
      message: `"${task.title}" will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    if (await this.tasks.remove(task.id)) {
      this.snackBar.open('Task deleted', 'Dismiss', { duration: 4000 });
    }
  }
}
