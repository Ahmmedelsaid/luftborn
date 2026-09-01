import { inject, Injectable } from '@angular/core';
import { StatisticApi } from '../api/statistic-api';
import { resourceError, resourceValue } from './resource.utils';

@Injectable({ providedIn: 'root' })
export class StatisticStore {
  private readonly api = inject(StatisticApi);

  private readonly resource = this.api.statisticsResource();

  readonly statistics = resourceValue(this.resource, []);
  readonly isLoading = this.resource.isLoading;
  readonly error = resourceError(this.resource);

  reload(): void {
    this.resource.reload();
  }
}
