import { computed, inject, Injectable } from '@angular/core';
import { UserApi } from '../api/user-api';
import { UserWorkload } from '../interfaces';
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

  /** Derived from the task collection, so it always agrees with the board. */
  readonly workloads = computed<UserWorkload[]>(() =>
    computeUserWorkloads(this.users(), this.tasks.tasks()),
  );

  reload(): void {
    this.resource.reload();
  }
}
