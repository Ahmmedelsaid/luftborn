import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

/**
 * Opens a confirmation prompt and resolves to the answer.
 *
 * A promise-returning service rather than a component the caller has to wire up,
 * so a guarded action reads as a single `await` in the middle of its own flow.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmDialogService {
  private readonly dialog = inject(MatDialog);

  async ask(data: ConfirmDialogData): Promise<boolean> {
    const reference = this.dialog.open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
      data,
      width: '400px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: 'dialog',
      restoreFocus: true,
    });

    return (await firstValueFrom(reference.afterClosed())) ?? false;
  }
}
