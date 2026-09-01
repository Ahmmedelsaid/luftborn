import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TaskPriority, TASK_PRIORITY_LABELS } from '../../../core/interfaces';

/** Uppercase priority pill, as rendered on every task card in the design. */
@Component({
  selector: 'app-priority-badge',
  template: '{{ label() }}',
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      padding: 2px 7px;
      border-radius: var(--app-radius-sm);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.06em;
      line-height: 16px;
      text-transform: uppercase;
      white-space: nowrap;
    }

    :host(.priority--high) {
      background: var(--app-priority-high-bg);
      color: var(--app-priority-high-fg);
    }

    :host(.priority--medium) {
      background: var(--app-priority-medium-bg);
      color: var(--app-priority-medium-fg);
    }

    :host(.priority--low) {
      background: var(--app-priority-low-bg);
      color: var(--app-priority-low-fg);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"priority--" + priority()',
    '[attr.aria-label]': '"Priority: " + label()',
  },
})
export class PriorityBadge {
  readonly priority = input.required<TaskPriority>();

  protected label(): string {
    return TASK_PRIORITY_LABELS[this.priority()];
  }
}
