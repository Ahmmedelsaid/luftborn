import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { UserWorkload } from '../../core/interfaces';
import { TaskStore } from '../../core/state/task-store';
import { UserStore } from '../../core/state/user-store';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { Avatar } from '../../shared/components/avatar/avatar';

/**
 * Team view.
 *
 * Workloads are derived from the loaded tasks, so the numbers here always agree
 * with the board. Clicking a member filters the board to their work, which makes
 * this a way in rather than a dead end.
 */
@Component({
  selector: 'app-team-page',
  imports: [
    Avatar,
    EmptyState,
    ErrorState,
    MatButtonModule,
    MatIconModule,
    PageHeader,
    Skeleton,
    TranslatePipe,
  ],
  templateUrl: './team-page.html',
  styleUrl: './team-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPage {
  private readonly users = inject(UserStore);
  private readonly tasks = inject(TaskStore);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  protected readonly workloads = this.users.workloads;
  protected readonly loading = this.users.isLoading;
  protected readonly loadError = this.users.error;

  protected readonly skeletonRows = [0, 1, 2, 3];

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  protected readonly summary = computed(() => {
    this.languageRevision();
    const people = this.workloads();

    return this.translate.instant('team.summary', {
      members: people.length,
      assigned: people.reduce((total, user) => total + user.totalTasks, 0),
    }) as string;
  });

  /** Busiest member, highlighted so a lopsided split is visible at a glance. */
  protected readonly busiest = computed(() => this.workloads()[0]?.id ?? null);

  protected onReload(): void {
    this.users.reload();
    this.tasks.reload();
  }

  /** Filters the board to one member's work, then navigates there. */
  protected async onViewTasks(user: UserWorkload): Promise<void> {
    this.tasks.resetFilters();
    this.tasks.patchFilters({ assigneeIds: [user.id] });

    await this.router.navigate(['/tasks']);
  }
}
