import { httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { User, ResourceFactoryOptions } from '../interfaces';
import { API_BASE_URL, httpOptions } from './api.config';

/** Users barely change, so they outlive the default cache TTL by a wide margin. */
const USERS_CACHE_TTL_MS = 5 * 60_000;

@Injectable({ providedIn: 'root' })
export class UserApi {
  private readonly baseUrl = inject(API_BASE_URL);

  usersResource(options?: ResourceFactoryOptions): HttpResourceRef<User[]> {
    return httpResource<User[]>(
      () => ({
        url: `${this.baseUrl}/users`,
        context: httpOptions({ cacheTtlMs: USERS_CACHE_TTL_MS }),
      }),
      {
        defaultValue: [],
        debugName: 'users',
        injector: options?.injector,
      },
    );
  }
}
