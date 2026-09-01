/**
 * Activity-feed state.
 *
 * Deliberately has no dependency on `TaskStore` — the arrow points the other
 * way, so recording an activity never risks a circular injection.
 */

import { computed, inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ActivityApi } from '../api/activity-api';
import { ActivityDraft, ActivityView } from '../models';
import { ClockService } from '../services/clock';
import { formatRelativeTime } from '../utils/date.utils';
import { patchResource, resourceError, resourceValue } from './resource.utils';

@Injectable({ providedIn: 'root' })
export class ActivityStore {
  private readonly api = inject(ActivityApi);
  private readonly clock = inject(ClockService);

  private readonly resource = this.api.activitiesResource();
  private readonly entries = resourceValue(this.resource, []);

  /** Feed entries with relative timestamps, refreshed as the clock ticks. */
  readonly activities = computed<ActivityView[]>(() => {
    const now = this.clock.now();

    return this.entries().map((activity) => ({
      ...activity,
      relativeTime: formatRelativeTime(activity.timestamp, now),
    }));
  });

  readonly isLoading = this.resource.isLoading;
  readonly error = resourceError(this.resource);

  reload(): void {
    this.resource.reload();
  }

  /**
   * Appends an entry, showing it immediately and reconciling with the server
   * response. A failure here is swallowed on purpose: the feed is an audit trail,
   * and losing one line must never surface as an error over a task mutation that
   * actually succeeded.
   */
  async record(draft: ActivityDraft): Promise<void> {
    const optimistic: ActivityView = {
      ...draft,
      id: `pending-${draft.taskId}-${draft.timestamp}`,
      relativeTime: 'just now',
    };

    patchResource(this.resource, (entries) => [optimistic, ...entries]);

    try {
      const saved = await firstValueFrom(this.api.record(draft));
      patchResource(this.resource, (entries) =>
        entries.map((entry) => (entry.id === optimistic.id ? saved : entry)),
      );
    } catch {
      patchResource(this.resource, (entries) =>
        entries.filter((entry) => entry.id !== optimistic.id),
      );
    }
  }
}
