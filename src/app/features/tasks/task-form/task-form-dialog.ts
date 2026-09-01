import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { TaskDraft } from '../../../core/interfaces';
import { TaskStore } from '../../../core/state/task-store';
import { UserStore } from '../../../core/state/user-store';
import { ConfirmDialogService } from '../../../shared/components/confirm-dialog/confirm-dialog.service';
import { TaskForm } from './task-form';

export interface TaskFormDialogData {
  /** Task to edit; absent when composing a new one. */
  readonly taskId?: string;
}

/** What the dialog resolves with, so the caller knows whether anything changed. */
export type TaskFormDialogResult = 'saved' | 'cancelled';

@Component({
  selector: 'app-task-form-dialog',
  imports: [MatButtonModule, MatDialogModule, MatIconModule, TaskForm, TranslatePipe],
  template: `
    <div class="dialog__head">
      <h2 mat-dialog-title class="dialog__title">{{ titleKey() | translate }}</h2>
      <button
        type="button"
        class="dialog__close"
        [attr.aria-label]="'actions.close' | translate"
        [disabled]="saving()"
        (click)="close()"
      >
        <mat-icon svgIcon="close" aria-hidden="true" />
      </button>
    </div>

    <mat-dialog-content>
      <app-task-form
        [task]="task()"
        [assignees]="assignees()"
        [saving]="saving()"
        (save)="onSave($event)"
        (cancelled)="close()"
      />
    </mat-dialog-content>
  `,
  styles: `
    .dialog__head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--app-space-3);
      padding-block: var(--app-space-4) 0;
      padding-inline: var(--app-space-6);
    }

    .dialog__title {
      margin: 0;
      padding: 0;
      font-size: 17px;
      font-weight: 600;
    }

    .dialog__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      padding: 0;
      border: none;
      border-radius: var(--app-radius-md);
      background: transparent;
      color: var(--app-text-secondary);
      cursor: pointer;

      &:hover {
        background: var(--app-surface-hover);
        color: var(--app-text);
      }

      mat-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }
    }

    mat-dialog-content {
      padding-block-end: var(--app-space-5);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFormDialog {
  private readonly dialog =
    inject<MatDialogRef<TaskFormDialog, TaskFormDialogResult>>(MatDialogRef);
  private readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);
  private readonly tasks = inject(TaskStore);
  private readonly users = inject(UserStore);
  private readonly confirm = inject(ConfirmDialogService);
  private readonly translate = inject(TranslateService);

  private readonly form = viewChild.required(TaskForm);

  constructor() {
    // The overlay is opened with `disableClose`, so that closing always goes
    // through the discard prompt and then through the router.
    this.dialog.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        void this.close();
      }
    });

    this.dialog.backdropClick().subscribe(() => void this.close());
  }

  protected readonly saving = signal(false);
  protected readonly assignees = this.users.users;

  protected readonly task = computed(() =>
    this.data.taskId ? this.tasks.taskById(this.data.taskId) : undefined,
  );

  protected readonly titleKey = computed(() => (this.task() ? 'form.editTitle' : 'form.newTitle'));

  protected async onSave(draft: TaskDraft): Promise<void> {
    this.saving.set(true);

    const existing = this.task();
    const ok = existing
      ? await this.tasks.update(existing.id, draft)
      : (await this.tasks.create(draft)) !== null;

    this.saving.set(false);

    if (ok) {
      this.dialog.close('saved');
    }
  }

  /** Confirms before discarding, but only when there is something to discard. */
  protected async close(): Promise<void> {
    if (!this.form().hasUnsavedChanges()) {
      this.dialog.close('cancelled');
      return;
    }

    const discard = await this.confirm.ask({
      title: this.translate.instant('form.discardTitle') as string,
      message: this.translate.instant('form.discardMessage') as string,
      confirmLabel: this.translate.instant('actions.discard') as string,
      cancelLabel: this.translate.instant('actions.keepEditing') as string,
      destructive: true,
    });

    if (discard) {
      this.dialog.close('cancelled');
    }
  }
}
