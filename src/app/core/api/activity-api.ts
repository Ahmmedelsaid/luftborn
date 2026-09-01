/** Typed HTTP client for `/api/activities`. */

import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, ActivityDraft, ActivityType, Task, TaskAssignee } from '../models';
import { API_BASE_URL, httpOptions, noCache, ResourceFactoryOptions } from './api.config';
import { createId } from './id.util';

/** How many entries the dashboard feed shows. */
export const ACTIVITY_FEED_LIMIT = 8;

/**
 * The feed must reflect a write immediately, so it is cached only long enough to
 * absorb the duplicate requests of a single page load.
 */
const ACTIVITY_CACHE_TTL_MS = 2_000;

@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get collectionUrl(): string {
    return `${this.baseUrl}/activities`;
  }

  /** Most recent entries first, limited server-side by json-server. */
  activitiesResource(options?: ResourceFactoryOptions): HttpResourceRef<Activity[]> {
    return httpResource<Activity[]>(
      () => ({
        url: this.collectionUrl,
        params: {
          _sort: 'timestamp',
          _order: 'desc',
          _limit: ACTIVITY_FEED_LIMIT,
        },
        context: httpOptions({ cacheTtlMs: ACTIVITY_CACHE_TTL_MS }),
      }),
      {
        defaultValue: [],
        debugName: 'activities',
        injector: options?.injector,
      },
    );
  }

  record(draft: ActivityDraft): Observable<Activity> {
    return this.http.post<Activity>(
      this.collectionUrl,
      { ...draft, id: createId('activity') },
      { context: noCache() },
    );
  }
}

/** Copy for each activity type, kept beside the client that writes them. */
const MESSAGES: Readonly<Record<ActivityType, (title: string) => string>> = {
  created: (title) => `created "${title}"`,
  updated: (title) => `updated "${title}"`,
  status_changed: (title) => `moved "${title}"`,
  completed: (title) => `completed "${title}"`,
  deleted: (title) => `deleted "${title}"`,
};

/**
 * Builds an activity entry for a task mutation.
 *
 * `actor` defaults to the task's assignee: the app has no authentication, so the
 * assignee is the closest thing to a real actor.
 */
export function buildActivity(
  type: ActivityType,
  task: Pick<Task, 'id' | 'title'>,
  now: Date,
  actor: TaskAssignee,
  message?: string,
): ActivityDraft {
  return {
    type,
    taskId: task.id,
    taskTitle: task.title,
    userId: actor.id,
    userName: actor.name,
    userAvatar: actor.avatar,
    message: message ?? MESSAGES[type](task.title),
    timestamp: now.toISOString(),
  };
}
