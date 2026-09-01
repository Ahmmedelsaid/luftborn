/** Typed HTTP client for `/api/statistics`. */

import { httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Statistic } from '../models';
import { API_BASE_URL, httpOptions, ResourceFactoryOptions } from './api.config';

/** The statistics fixture is static, so it is cached aggressively. */
const STATISTICS_CACHE_TTL_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class StatisticApi {
  private readonly baseUrl = inject(API_BASE_URL);

  statisticsResource(options?: ResourceFactoryOptions): HttpResourceRef<Statistic[]> {
    return httpResource<Statistic[]>(
      () => ({
        url: `${this.baseUrl}/statistics`,
        context: httpOptions({ cacheTtlMs: STATISTICS_CACHE_TTL_MS }),
      }),
      {
        defaultValue: [],
        debugName: 'statistics',
        injector: options?.injector,
      },
    );
  }
}
