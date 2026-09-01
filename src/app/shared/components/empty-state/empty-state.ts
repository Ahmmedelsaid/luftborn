import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Covers three situations that need different copy: genuinely empty, filtered to
 * nothing, and nothing matched. The caller picks the icon and message.
 */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <mat-icon class="empty__icon" [svgIcon]="icon()" aria-hidden="true" />
    <p class="empty__title">{{ title() }}</p>
    @if (message()) {
      <p class="empty__message">{{ message() }}</p>
    }
    <div class="empty__actions">
      <ng-content />
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--app-space-2);
      padding: var(--app-space-8) var(--app-space-4);
      text-align: center;
      color: var(--app-text-secondary);
    }

    .empty__icon {
      width: 32px;
      height: 32px;
      margin-bottom: var(--app-space-1);
      font-size: 32px;
      color: var(--app-text-muted);
    }

    .empty__title {
      color: var(--app-text);
      font-size: 14px;
      font-weight: 600;
    }

    .empty__message {
      max-width: 34ch;
      font-size: 13px;
    }

    .empty__actions:empty {
      display: none;
    }

    .empty__actions {
      display: flex;
      gap: var(--app-space-2);
      margin-top: var(--app-space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly icon = input<string>('inbox');
}
