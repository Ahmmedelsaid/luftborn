import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';
import { TaskPriority, TASK_PRIORITY_LABEL_KEYS } from '../../../core/interfaces';

/**
 * Uppercase priority pill, as rendered on every task card in the design.
 *
 * The label is resolved imperatively rather than through the pipe, because it
 * also feeds an `aria-label` host binding. It tracks `onLangChange` so a
 * language switch repaints it.
 */
@Component({
  selector: 'app-priority-badge',
  template: '{{ label() }}',
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      padding-block: 2px;
      padding-inline: 7px;
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
    '[attr.aria-label]': 'ariaLabel()',
  },
})
export class PriorityBadge {
  private readonly translate = inject(TranslateService);

  readonly priority = input.required<TaskPriority>();

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  protected readonly label = computed(() => {
    this.languageRevision();
    return this.translate.instant(TASK_PRIORITY_LABEL_KEYS[this.priority()]) as string;
  });

  protected readonly ariaLabel = computed(
    () => this.translate.instant('priority.aria', { value: this.label() }) as string,
  );
}
