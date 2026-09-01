import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterOutlet } from '@angular/router';
import { TaskPriority, TaskSortKey, TaskStatus, TaskView } from '../../core/interfaces';
import { TaskStore } from '../../core/state/task-store';
import { UserStore } from '../../core/state/user-store';
import { TaskBoard } from '../../shared/components/board/task-board';
import { ConfirmDialogService } from '../../shared/components/confirm-dialog/confirm-dialog.service';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { FilterBar } from '../../shared/components/filter-bar/filter-bar';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { TaskMove } from '../../shared/interfaces';

/** Sort options offered in the toolbar, with the copy the user reads. */
const SORT_OPTIONS: readonly { readonly key: TaskSortKey; readonly label: string }[] = [
  { key: 'manual', label: 'Board order' },
  { key: 'dueDate', label: 'Due date' },
  { key: 'priority', label: 'Priority' },
  { key: 'title', label: 'Title' },
  { key: 'updatedAt', label: 'Recently updated' },
];

/**
 * Tasks page.
 *
 * Shares the board, filter bar and stores with the dashboard, and adds the sort
 * control. Keeping one board component means a fix to card behaviour lands on
 * both surfaces at once.
 */
@Component({
  selector: 'app-tasks-page',
  imports: [
    ErrorState,
    FilterBar,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    PageHeader,
    RouterOutlet,
    TaskBoard,
  ],
  templateUrl: './tasks-page.html',
  styleUrl: './tasks-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {
  private readonly tasks = inject(TaskStore);
  private readonly users = inject(UserStore);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly board = this.tasks.board;
  protected readonly loading = this.tasks.isLoading;
  protected readonly loadError = this.tasks.loadError;
  protected readonly pendingIds = this.tasks.pendingIds;
  protected readonly hasFilters = this.tasks.hasActiveFilters;
  protected readonly filters = this.tasks.filters;
  protected readonly assignees = this.users.users;
  protected readonly sortKey = this.tasks.sortKey;

  protected readonly sortOptions = SORT_OPTIONS;

  protected readonly activeStatus = computed<TaskStatus | null>(
    () => this.filters().statuses[0] ?? null,
  );

  protected readonly sortLabel = computed(
    () => SORT_OPTIONS.find((option) => option.key === this.sortKey())?.label ?? 'Sort',
  );

  protected readonly summary = computed(() => {
    const totals = this.tasks.filteredTotals();
    return `${totals.total} shown · ${totals.overdue} overdue · ${totals.done} done`;
  });

  constructor() {
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

    this.tasks.patchFilters({
      priorities: current.includes(priority)
        ? current.filter((value) => value !== priority)
        : [...current, priority],
    });
  }

  protected onAssigneeToggle(id: string): void {
    const current = this.filters().assigneeIds;

    this.tasks.patchFilters({
      assigneeIds: current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    });
  }

  protected onClearFilters(): void {
    this.tasks.resetFilters();
  }

  protected onSort(key: TaskSortKey): void {
    this.tasks.setSortKey(key);
  }

  protected onReload(): void {
    this.tasks.reload();
  }

  protected onTaskMoved(move: TaskMove): void {
    void this.tasks.move(move.taskId, move.toStatus, move.toIndex);
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
