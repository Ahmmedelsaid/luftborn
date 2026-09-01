import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { LocalisePipe } from '../../../core/i18n/localise.pipe';
import {
  DueDateState,
  TaskStatus,
  TaskView,
  TASK_STATUS_LABEL_KEYS,
} from '../../../core/interfaces';
import { Avatar } from '../avatar/avatar';
import { PriorityBadge } from '../priority-badge/priority-badge';

/** Icon per due-date treatment, matching the three variants in the design. */
const DUE_STATE_ICONS: Readonly<Record<DueDateState, string>> = {
  overdue: 'overdue',
  'due-soon': 'due-date',
  upcoming: 'due-date',
  completed: 'completed',
};

/**
 * Task card. Purely presentational — it renders a {@link TaskView} and emits
 * intent, so the same component serves the board, the task list and any future
 * surface without knowing where its data comes from.
 */
@Component({
  selector: 'app-task-card',
  imports: [Avatar, LocalisePipe, MatIconModule, MatMenuModule, PriorityBadge, TranslatePipe],
  templateUrl: './task-card.html',
  styleUrl: './task-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-task-card',
    '[class.card--overdue]': 'task().overdue',
    '[class.card--done]': 'task().status === "done"',
    '[class.card--pending]': 'pending()',
    '[attr.aria-busy]': 'pending() ? "true" : null',
  },
})
export class TaskCard {
  readonly task = input.required<TaskView>();

  /** True while a mutation for this task is in flight. */
  readonly pending = input<boolean>(false);

  /** Statuses offered in the "Move to" submenu, excluding the current one. */
  readonly moveTargets = input<readonly TaskStatus[]>([]);

  readonly edit = output<TaskView>();
  readonly remove = output<TaskView>();
  readonly moveTo = output<TaskStatus>();
  readonly open = output<TaskView>();

  protected readonly dueIcon = computed(() => DUE_STATE_ICONS[this.task().dueState]);

  /** The design shows `@John`, not the full name. */
  protected readonly handle = computed(() => `@${this.task().assignee.name.split(' ')[0]}`);

  protected readonly statusLabelKeys = TASK_STATUS_LABEL_KEYS;
}
