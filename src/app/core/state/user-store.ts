/**
 * User state. Workloads are derived from the task collection rather than stored,
 * so the numbers on the Team page always agree with the board.
 */

import { computed, inject, Injectable } from '@angular/core';
import { UserApi } from '../api/user-api';
import { UserWorkload } from '../models';
import { computeUserWorkloads } from '../utils/task.utils';
import { resourceError, resourceValue } from './resource.utils';
import { TaskStore } from './task-store';

@Injectable({ providedIn: 'root' })
export class UserStore {
  private readonly api = inject(UserApi);
  private readonly tasks = inject(TaskStore);

  private readonly resource = this.api.usersResource();

  readonly users = resourceValue(this.resource, []);
  readonly isLoading = this.resource.isLoading;
  readonly error = resourceError(this.resource);

  /** Users joined with their current task counts, busiest first. */
  readonly workloads = computed<UserWorkload[]>(() =>
    computeUserWorkloads(this.users(), this.tasks.tasks()),
  );

  reload(): void {
    this.resource.reload();
  }
}
