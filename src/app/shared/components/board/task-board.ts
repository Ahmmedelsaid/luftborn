import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  BoardColumn,
  TaskStatus,
  TaskView,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from '../../../core/interfaces';
import { TaskMove } from '../../interfaces';
import { EmptyState } from '../empty-state/empty-state';
import { Skeleton } from '../skeleton/skeleton';
import { TaskCard } from '../task-card/task-card';

/**
 * Kanban board with drag-and-drop between and within columns.
 *
 * Presentational: columns come in already grouped and sorted by the store, and
 * a drop is emitted as a {@link TaskMove} rather than mutating anything here.
 */
@Component({
  selector: 'app-task-board',
  imports: [DragDropModule, EmptyState, MatButtonModule, MatIconModule, Skeleton, TaskCard],
  templateUrl: './task-board.html',
  styleUrl: './task-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-task-board' },
})
export class TaskBoard {
  readonly columns = input.required<readonly BoardColumn[]>();
  readonly loading = input<boolean>(false);
  readonly pendingIds = input<ReadonlySet<string>>(new Set());

  /** Distinguishes "no tasks yet" from "no tasks match the filters". */
  readonly filtered = input<boolean>(false);

  readonly taskMoved = output<TaskMove>();
  readonly editTask = output<TaskView>();
  readonly deleteTask = output<TaskView>();
  readonly openTask = output<TaskView>();
  readonly createTask = output<void>();
  readonly clearFilters = output<void>();

  protected readonly statusLabels = TASK_STATUS_LABELS;

  /** Connects every column to every other, so a card can be dropped anywhere. */
  protected readonly dropListIds = computed(() =>
    this.columns().map((column) => `board-column-${column.status}`),
  );

  protected readonly isEmpty = computed(() =>
    this.columns().every((column) => column.tasks.length === 0),
  );

  /** Placeholder rows per column while the first load is in flight. */
  protected readonly skeletonRows = [0, 1, 2];

  /** "Move to" targets for the card menu: every status except the current one. */
  protected moveTargetsFor(status: TaskStatus): TaskStatus[] {
    return TASK_STATUSES.filter((candidate) => candidate !== status);
  }

  protected isPending(id: string): boolean {
    return this.pendingIds().has(id);
  }

  protected onDrop(event: CdkDragDrop<TaskStatus>, toStatus: TaskStatus): void {
    const taskId = event.item.data as string;
    const sameColumn = event.previousContainer === event.container;

    if (sameColumn && event.previousIndex === event.currentIndex) {
      return;
    }

    this.taskMoved.emit({ taskId, toStatus, toIndex: event.currentIndex });
  }
}
