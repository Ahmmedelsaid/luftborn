import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  TaskPriority,
  TaskStatus,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABEL_KEYS,
  TASK_STATUSES,
  TASK_STATUS_LABEL_KEYS,
  User,
} from '../../../core/interfaces';
import { StatusSegment } from '../../interfaces';
import { Avatar } from '../avatar/avatar';

/**
 * Board toolbar: status segments, priority and assignee filters, and the primary
 * create action. Presentational — current filter values come in, changes go out.
 */
@Component({
  selector: 'app-filter-bar',
  imports: [Avatar, MatButtonModule, MatIconModule, MatMenuModule, TranslatePipe],
  templateUrl: './filter-bar.html',
  styleUrl: './filter-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-filter-bar' },
})
export class FilterBar {
  private readonly translate = inject(TranslateService);

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
    { value: null, labelKey: 'status.all' },
    ...TASK_STATUSES.map((status) => ({ value: status, labelKey: TASK_STATUS_LABEL_KEYS[status] })),
  ];

  protected readonly priorities = TASK_PRIORITIES;
  protected readonly priorityLabelKeys = TASK_PRIORITY_LABEL_KEYS;

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  /** Summarises the priority selection; the trigger has no room for a list. */
  protected readonly priorityLabel = computed(() => {
    this.languageRevision();
    const selected = this.activePriorities();

    if (selected.length === 0) {
      return this.translate.instant('priority.label') as string;
    }

    if (selected.length === 1) {
      return this.translate.instant(TASK_PRIORITY_LABEL_KEYS[selected[0]]) as string;
    }

    return this.translate.instant('priority.selected', { count: selected.length }) as string;
  });

  protected readonly assigneeLabel = computed(() => {
    this.languageRevision();
    const selected = this.activeAssigneeIds();

    if (selected.length === 0) {
      return this.translate.instant('filters.assignee') as string;
    }

    const match = this.assignees().find((user) => user.id === selected[0]);
    const name = match
      ? match.name.split(' ')[0]
      : (this.translate.instant('filters.assignee') as string);

    return selected.length === 1
      ? name
      : (this.translate.instant('filters.assigneeMore', {
          name,
          count: selected.length - 1,
        }) as string);
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
