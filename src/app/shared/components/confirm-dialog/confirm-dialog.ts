import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

/** Content and styling for a confirmation prompt. */
export interface ConfirmDialogData {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  /** Styles the confirm button as a warning, for irreversible actions. */
  readonly destructive?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatButtonModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title class="confirm__title">{{ data.title }}</h2>

    <mat-dialog-content class="confirm__message">{{ data.message }}</mat-dialog-content>

    <mat-dialog-actions class="confirm__actions">
      <button matButton type="button" (click)="dialog.close(false)">
        {{ data.cancelLabel ?? 'Cancel' }}
      </button>
      <button
        matButton="filled"
        type="button"
        cdkFocusInitial
        [class.confirm__danger]="data.destructive"
        (click)="dialog.close(true)"
      >
        {{ data.confirmLabel ?? 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .confirm__title {
      font-size: 16px;
      font-weight: 600;
    }

    .confirm__message {
      color: var(--app-text-secondary);
      font-size: 13.5px;
      line-height: 1.5;
    }

    .confirm__actions {
      gap: var(--app-space-2);
      padding-block-end: var(--app-space-4);
      padding-inline: var(--app-space-6);
    }

    .confirm__danger {
      --mat-filled-button-container-color: var(--app-overdue-fg);
      --mat-filled-button-label-text-color: #fff;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly dialog = inject<MatDialogRef<ConfirmDialog, boolean>>(MatDialogRef);
  protected readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
