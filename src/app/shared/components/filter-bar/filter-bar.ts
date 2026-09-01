import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import {
  TaskPriority,
  TaskStatus,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  User,
} from '../../../core/interfaces';
import { Avatar } from '../avatar/avatar';

/** One entry in the status segmented control. `null` is the "All" segment. */
interface StatusSegment {
  readonly value: TaskStatus | null;
  readonly label: string;
}

/**
 * Board toolbar: status segments, priority and assignee filters, and the primary
 * create action. Presentational — current filter values come in, changes go out.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [Avatar, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-filter-bar' },
})
export class FilterBar {
  readonly activeStatus = input<TaskStatus | null>(null);
  readonly activePriorities = input<readonly TaskPriority[]>([]);
  readonly activeAssigneeIds = input<readonly string[]>([]);
  readonly assignees = input<readonly User[]>([]);

  readonly statusChange = output<TaskStatus | null>();
  readonly priorityToggle = output<TaskPriority>();
  readonly assigneeToggle = output<string>();
  readonly clearFilters = output<void>();
  readonly createTask = output<void>();

  protected readonly segments: readonly StatusSegment[] = [
    { value: null, label: 'All' },
    ...TASK_STATUSES.map((status) => ({ value: status, label: TASK_STATUS_LABELS[status] })),
  ];

  protected readonly priorities = TASK_PRIORITIES;
  protected readonly priorityLabels = TASK_PRIORITY_LABELS;

  protected readonly priorityButtonLabel = computed(() => {
    const selected = this.activePriorities();

    if (selected.length === 0) {
      return 'Priority';
    }

    if (selected.length === 1) {
      return TASK_PRIORITY_LABELS[selected[0]];
    }

    return `Priority (${selected.length})`;
  });

  protected readonly assigneeButtonLabel = computed(() => {
    const selected = this.activeAssigneeIds();

    if (selected.length === 0) {
      return 'Assignee';
    }

    const match = this.assignees().find((user) => user.id === selected[0]);
    const name = match ? match.name.split(' ')[0] : 'Assignee';

    return selected.length === 1 ? name : `${name} +${selected.length - 1}`;
  });

  protected readonly hasFilters = computed(
    () => this.activePriorities().length > 0 || this.activeAssigneeIds().length > 0,
  );

  protected isPriorityActive(priority: TaskPriority): boolean {
    return this.activePriorities().includes(priority);
  }

  protected isAssigneeActive(id: string): boolean {
    return this.activeAssigneeIds().includes(id);
  }
}
