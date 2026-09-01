import { ChangeDetectionStrategy, Component, inject, Injector } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { TaskFormDialogData, TaskFormDialogResult } from '../interfaces';
import { TaskFormDialog } from './task-form-dialog';

/**
 * Routed opener for the task form.
 *
 * The brief asks for editing via a modal, and the modal is reached through a
 * route so it is deep-linkable, survives a refresh and closes on browser back.
 * The id is read from the route snapshot rather than a bound input, because the
 * dialog has to open during construction and inputs are not set until after.
 */
@Component({
  selector: 'app-task-form-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormPage {
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  constructor() {
    const taskId = this.route.snapshot.paramMap.get('id') ?? undefined;

    void this.open(taskId);
  }

  private async open(taskId: string | undefined): Promise<void> {
    const reference = this.dialog.open<TaskFormDialog, TaskFormDialogData, TaskFormDialogResult>(
      TaskFormDialog,
      {
        data: { taskId },
        // A dialog is created against the root environment injector, so the
        // route-scoped `provideNativeDateAdapter()` would be invisible to the
        // datepicker inside it. Passing this component's injector keeps the
        // adapter out of the initial bundle without breaking the form.
        injector: this.injector,
        width: '640px',
        maxWidth: 'calc(100vw - 32px)',
        maxHeight: 'calc(100dvh - 48px)',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        // Closing has to go through the route, so `Escape` and the backdrop are
        // handled by this component rather than by the overlay.
        disableClose: true,
      },
    );

    await firstValueFrom(reference.afterClosed());

    // Replaces the modal route rather than pushing, so browser back does not
    // immediately reopen the form.
    await this.router.navigate(['/tasks'], { replaceUrl: true });
  }
}
