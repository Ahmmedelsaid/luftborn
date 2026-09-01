/**
 * Single source of truth for tasks. Reads come from an `httpResource`;
 * everything else is a `computed()` over that one collection. Mutations are
 * optimistic and roll back on failure.
 *
 * Reports failures through {@link mutationError} and a boolean return value —
 * snackbars and dialogs belong to the feature components.
 */

import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TaskApi } from '../api/task-api';
import { buildActivity } from '../api/activity-api';
import { ApiError, isApiError, Task, TaskDraft, TaskPatch, TaskStatus, TaskView } from '../models';
import { ClockService } from '../services/clock';
import {
  computeTaskTotals,
  EMPTY_TASK_FILTERS,
  filterTasks,
  groupTasksByStatus,
  hasActiveFilters,
  sortTasks,
  TaskFilters,
  TaskSortKey,
  toTaskView,
} from '../utils/task.utils';
import { ActivityStore } from './activity-store';
import { patchResource, resourceError, resourceValue } from './resource.utils';

/** One kanban column. */
export interface BoardColumn {
  readonly status: TaskStatus;
  readonly tasks: readonly TaskView[];
  readonly count: number;
}

@Injectable({ providedIn: 'root' })
export class TaskStore {
  private readonly api = inject(TaskApi);
  private readonly activities = inject(ActivityStore);
  private readonly clock = inject(ClockService);

  private readonly resource = this.api.tasksResource();
  private readonly loaded = resourceValue(this.resource, []);

  private readonly filtersState = signal<TaskFilters>(EMPTY_TASK_FILTERS);
  private readonly sortState = signal<TaskSortKey>('manual');
  private readonly pendingState = signal<ReadonlySet<string>>(new Set());
  private readonly mutationErrorState = signal<ApiError | null>(null);

  readonly filters = this.filtersState.asReadonly();

  readonly sortKey = this.sortState.asReadonly();

  /** Tasks with an in-flight mutation, for per-card busy states. */
  readonly pendingIds = this.pendingState.asReadonly();

  /** Last failed mutation, or `null`. */
  readonly mutationError = this.mutationErrorState.asReadonly();

  readonly isLoading = this.resource.isLoading;

  readonly loadError = resourceError(this.resource);

  /** `index` seeds `order` for fixtures that ship without one. */
  readonly tasks = computed<TaskView[]>(() => {
    const now = this.clock.now();
    return this.loaded().map((task, index) => toTaskView(task, now, index));
  });

  readonly filteredTasks = computed(() => filterTasks(this.tasks(), this.filtersState()));

  readonly hasActiveFilters = computed(() => hasActiveFilters(this.filtersState()));

  /** Column counts reflect the filtered set, which is what the user can see. */
  readonly board = computed<readonly BoardColumn[]>(() => {
    const grouped = groupTasksByStatus(this.filteredTasks());
    const sortKey = this.sortState();

    return (Object.keys(grouped) as TaskStatus[]).map((status) => {
      const tasks = sortTasks(grouped[status], sortKey);
      return { status, tasks, count: tasks.length };
    });
  });

  readonly totals = computed(() => computeTaskTotals(this.tasks()));

  readonly filteredTotals = computed(() => computeTaskTotals(this.filteredTasks()));

  readonly allTags = computed(() =>
    [...new Set(this.tasks().flatMap((task) => task.tags))].sort((a, b) => a.localeCompare(b)),
  );

  private readonly tasksById = computed(() => new Map(this.tasks().map((task) => [task.id, task])));

  taskById(id: string): TaskView | undefined {
    return this.tasksById().get(id);
  }

  isPending(id: string): boolean {
    return this.pendingState().has(id);
  }

  // Filter and sort

  patchFilters(patch: Partial<TaskFilters>): void {
    this.filtersState.update((filters) => ({ ...filters, ...patch }));
  }

  setSearch(search: string): void {
    this.patchFilters({ search });
  }

  /** `null` clears the status filter. */
  setStatusFilter(status: TaskStatus | null): void {
    this.patchFilters({ statuses: status ? [status] : [] });
  }

  setSortKey(key: TaskSortKey): void {
    this.sortState.set(key);
  }

  resetFilters(): void {
    this.filtersState.set(EMPTY_TASK_FILTERS);
  }

  // Loading

  reload(): void {
    this.resource.reload();
  }

  dismissError(): void {
    this.mutationErrorState.set(null);
  }

  // Mutations

  /** Returns the persisted task, or `null` when the write failed and rolled back. */
  async create(draft: TaskDraft): Promise<Task | null> {
    const now = this.clock.snapshot();
    const optimistic = this.api.buildTask(draft, this.nextOrderFor(draft.status), now);

    patchResource(this.resource, (tasks) => [...tasks, optimistic]);
    this.markPending(optimistic.id);

    try {
      const saved = await firstValueFrom(this.api.create(optimistic));
      this.replaceTask(optimistic.id, saved);
      void this.activities.record(buildActivity('created', saved, now, saved.assignee));
      return saved;
    } catch (error) {
      patchResource(this.resource, (tasks) => tasks.filter((task) => task.id !== optimistic.id));
      this.reportFailure(error);
      return null;
    } finally {
      this.clearPending(optimistic.id);
    }
  }

  /** Returns `false` when the write failed and the task was restored. */
  async update(id: string, patch: TaskPatch): Promise<boolean> {
    const previous = this.loaded().find((task) => task.id === id);

    if (!previous) {
      return false;
    }

    const now = this.clock.snapshot();
    const fullPatch = this.withCompletionTimestamp(previous, patch, now);

    patchResource(this.resource, (tasks) =>
      tasks.map((task) => (task.id === id ? { ...task, ...fullPatch } : task)),
    );
    this.markPending(id);

    try {
      const saved = await firstValueFrom(this.api.update(id, fullPatch));
      this.replaceTask(id, saved);
      void this.activities.record(
        buildActivity(this.activityTypeFor(previous, fullPatch), saved, now, saved.assignee),
      );
      return true;
    } catch (error) {
      this.replaceTask(id, previous);
      this.reportFailure(error);
      return false;
    } finally {
      this.clearPending(id);
    }
  }

  /** Returns `false` when the write failed and the task was restored. */
  async remove(id: string): Promise<boolean> {
    const previous = this.loaded().find((task) => task.id === id);

    if (!previous) {
      return false;
    }

    const now = this.clock.snapshot();

    patchResource(this.resource, (tasks) => tasks.filter((task) => task.id !== id));
    this.markPending(id);

    try {
      await firstValueFrom(this.api.remove(id));
      void this.activities.record(buildActivity('deleted', previous, now, previous.assignee));
      return true;
    } catch (error) {
      patchResource(this.resource, (tasks) => [...tasks, previous]);
      this.reportFailure(error);
      return false;
    } finally {
      this.clearPending(id);
    }
  }

  /**
   * Only the moved task is written back — sibling positions are derived from
   * fractional midpoints, so a drop is one request rather than one per card.
   */
  async move(id: string, toStatus: TaskStatus, toIndex: number): Promise<boolean> {
    const previous = this.loaded().find((task) => task.id === id);

    if (!previous) {
      return false;
    }

    const order = this.orderForPosition(id, toStatus, toIndex);
    const statusChanged = previous.status !== toStatus;

    return this.update(id, statusChanged ? { status: toStatus, order } : { order });
  }

  // Internals

  private nextOrderFor(status: TaskStatus): number {
    const orders = this.loaded()
      .filter((task) => task.status === status)
      .map((task, index) => task.order ?? index);

    return orders.length === 0 ? 0 : Math.max(...orders) + ORDER_STEP;
  }

  /** Lands the task between its new neighbours, leaving siblings untouched. */
  private orderForPosition(id: string, status: TaskStatus, index: number): number {
    const column = this.tasks()
      .filter((task) => task.status === status && task.id !== id)
      .sort((a, b) => a.order - b.order);

    const before = column[index - 1];
    const after = column[index];

    if (!before && !after) {
      return 0;
    }

    if (!before) {
      return after.order - ORDER_STEP;
    }

    if (!after) {
      return before.order + ORDER_STEP;
    }

    return (before.order + after.order) / 2;
  }

  /** The API will not do this: Done stamps `completedAt`, leaving Done clears it. */
  private withCompletionTimestamp(previous: Task, patch: TaskPatch, now: Date): TaskPatch {
    const nextStatus = patch.status ?? previous.status;

    if (patch.status === undefined || nextStatus === previous.status) {
      return { ...patch, updatedAt: now.toISOString() };
    }

    return {
      ...patch,
      updatedAt: now.toISOString(),
      completedAt: nextStatus === 'done' ? now.toISOString() : undefined,
    };
  }

  private activityTypeFor(
    previous: Task,
    patch: TaskPatch,
  ): 'completed' | 'status_changed' | 'updated' {
    if (patch.status === undefined || patch.status === previous.status) {
      return 'updated';
    }

    return patch.status === 'done' ? 'completed' : 'status_changed';
  }

  private replaceTask(id: string, replacement: Task): void {
    patchResource(this.resource, (tasks) =>
      tasks.map((task) => (task.id === id ? replacement : task)),
    );
  }

  private markPending(id: string): void {
    this.pendingState.update((ids) => new Set(ids).add(id));
  }

  private clearPending(id: string): void {
    this.pendingState.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }

  private reportFailure(error: unknown): void {
    this.mutationErrorState.set(
      isApiError(error)
        ? error
        : {
            status: 0,
            kind: 'unknown',
            url: '',
            message: 'An unexpected error occurred. Please try again.',
            retryable: false,
          },
    );
  }
}

/** Gap between consecutive `order` values, so an insert never needs a rewrite. */
const ORDER_STEP = 1000;
