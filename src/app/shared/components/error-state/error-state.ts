import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ApiError } from '../../../core/interfaces';

/**
 * Takes the normalised {@link ApiError}, so the message is always user-facing and
 * the retry button appears only when retrying could help.
 */
@Component({
  selector: 'app-error-state',
  imports: [MatButtonModule, MatIconModule],
  template: `
    <mat-icon class="error__icon" [svgIcon]="iconFor(error().kind)" aria-hidden="true" />
    <p class="error__title">{{ title() }}</p>
    <p class="error__message">{{ error().message }}</p>
    @if (error().retryable) {
      <button matButton="outlined" type="button" (click)="retry.emit()">
        <mat-icon svgIcon="refresh" aria-hidden="true" />
        Try again
      </button>
    }
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
    }

    .error__icon {
      width: 32px;
      height: 32px;
      font-size: 32px;
      color: var(--app-overdue-fg);
    }

    .error__title {
      color: var(--app-text);
      font-size: 14px;
      font-weight: 600;
    }

    .error__message {
      max-width: 40ch;
      margin-bottom: var(--app-space-2);
      color: var(--app-text-secondary);
      font-size: 13px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly error = input.required<ApiError>();
  readonly title = input<string>('Could not load this content');

  readonly retry = output<void>();

  protected iconFor(kind: ApiError['kind']): string {
    return kind === 'offline' ? 'cloud-off' : 'overdue';
  }
}
