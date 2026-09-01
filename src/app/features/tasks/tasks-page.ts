import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
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
const SORT_OPTIONS: readonly { readonly key: TaskSortKey; readonly labelKey: string }[] = [
  { key: 'manual', labelKey: 'sort.manual' },
  { key: 'dueDate', labelKey: 'sort.dueDate' },
  { key: 'priority', labelKey: 'sort.priority' },
  { key: 'title', labelKey: 'sort.title' },
  { key: 'updatedAt', labelKey: 'sort.updatedAt' },
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
    TranslatePipe,
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
  private readonly translate = inject(TranslateService);

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

  protected readonly sortLabelKey = computed(
    () => SORT_OPTIONS.find((option) => option.key === this.sortKey())?.labelKey ?? 'sort.manual',
  );

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  protected readonly summary = computed(() => {
    this.languageRevision();
    const totals = this.tasks.filteredTotals();
    return this.translate.instant('tasks.summary', {
      shown: totals.total,
      overdue: totals.overdue,
      done: totals.done,
    }) as string;
  });

  constructor() {
    effect(() => {
      const error = this.tasks.mutationError();

      if (!error) {
        return;
      }

      this.snackBar.open(error.message, this.translate.instant('errors.dismiss') as string, {
        duration: 6000,
      });
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
      title: this.translate.instant('delete.title') as string,
      message: this.translate.instant('delete.message', { title: task.title }) as string,
      confirmLabel: this.translate.instant('actions.delete') as string,
      cancelLabel: this.translate.instant('actions.cancel') as string,
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    if (await this.tasks.remove(task.id)) {
      this.snackBar.open(
        this.translate.instant('delete.success') as string,
        this.translate.instant('errors.dismiss') as string,
        { duration: 4000 },
      );
    }
  }
}
