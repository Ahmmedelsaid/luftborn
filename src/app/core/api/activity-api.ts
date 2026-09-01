import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Activity,
  ActivityDraft,
  ActivityType,
  Task,
  TaskAssignee,
  ResourceFactoryOptions,
} from '../interfaces';
import { API_BASE_URL, httpOptions, noCache } from './api.config';
import { createId } from './id.util';

export const ACTIVITY_FEED_LIMIT = 8;

/** Short, because the feed must reflect a write immediately. */
const ACTIVITY_CACHE_TTL_MS = 2_000;

@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get collectionUrl(): string {
    return `${this.baseUrl}/activities`;
  }

  activitiesResource(options?: ResourceFactoryOptions): HttpResourceRef<Activity[]> {
    return httpResource<Activity[]>(
      () => ({
        url: this.collectionUrl,
        params: { _sort: 'timestamp', _order: 'desc', _limit: ACTIVITY_FEED_LIMIT },
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

const MESSAGES: Readonly<Record<ActivityType, (title: string) => string>> = {
  created: (title) => `created "${title}"`,
  updated: (title) => `updated "${title}"`,
  status_changed: (title) => `moved "${title}"`,
  completed: (title) => `completed "${title}"`,
  deleted: (title) => `deleted "${title}"`,
};

/** `actor` is the assignee, since the app has no authentication. */
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
