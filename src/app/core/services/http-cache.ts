/**
 * In-memory HTTP response cache backing `cacheInterceptor`.
 *
 * Does two jobs: TTL caching of `GET` responses, and de-duplication of
 * identical requests that are already in flight.
 */

import { HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

interface CacheEntry {
  readonly response: HttpResponse<unknown>;
  readonly expiresAt: number;
}

export interface HttpCacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly deduplicated: number;
}

@Injectable({ providedIn: 'root' })
export class HttpCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Map<string, Observable<HttpEvent<unknown>>>();

  private readonly statsState = signal<HttpCacheStats>({
    entries: 0,
    hits: 0,
    misses: 0,
    deduplicated: 0,
  });

  /** Live cache statistics, surfaced on the Settings page. */
  readonly stats = this.statsState.asReadonly();

  /**
   * Cache key including serialised params, since `/tasks?status=todo` and
   * `/tasks?status=done` are different resources.
   */
  keyFor(request: HttpRequest<unknown>): string {
    const params = request.params.toString();
    return params
      ? `${request.method} ${request.url}?${params}`
      : `${request.method} ${request.url}`;
  }

  /** Returns a fresh cached response, or `null` on a miss or expiry. */
  get(key: string): HttpResponse<unknown> | null {
    const entry = this.entries.get(key);

    if (!entry) {
      this.recordMiss();
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(key);
      this.syncEntryCount();
      this.recordMiss();
      return null;
    }

    this.statsState.update((stats) => ({ ...stats, hits: stats.hits + 1 }));
    return entry.response;
  }

  set(key: string, response: HttpResponse<unknown>, ttlMs: number): void {
    if (ttlMs <= 0) {
      return;
    }

    this.entries.set(key, { response, expiresAt: Date.now() + ttlMs });
    this.syncEntryCount();
  }

  /** The shared observable for a request already in flight, if any. */
  getInFlight(key: string): Observable<HttpEvent<unknown>> | null {
    const pending = this.inFlight.get(key) ?? null;

    if (pending) {
      this.statsState.update((stats) => ({ ...stats, deduplicated: stats.deduplicated + 1 }));
    }

    return pending;
  }

  setInFlight(key: string, request$: Observable<HttpEvent<unknown>>): void {
    this.inFlight.set(key, request$);
  }

  clearInFlight(key: string): void {
    this.inFlight.delete(key);
  }

  /**
   * Invalidates every cached view of the collection a mutation touched, so
   * `PATCH /api/tasks/task-001` also clears `GET /api/tasks` and its filtered
   * variants.
   */
  invalidateCollection(url: string): void {
    const collection = collectionPathOf(url);

    if (!collection) {
      return;
    }

    for (const key of [...this.entries.keys()]) {
      if (keyTargetsCollection(key, collection)) {
        this.entries.delete(key);
      }
    }

    this.syncEntryCount();
  }

  /** Drops every entry. Backs the manual refresh action. */
  clear(): void {
    this.entries.clear();
    this.syncEntryCount();
  }

  resetStats(): void {
    this.statsState.set({ entries: this.entries.size, hits: 0, misses: 0, deduplicated: 0 });
  }

  private recordMiss(): void {
    this.statsState.update((stats) => ({ ...stats, misses: stats.misses + 1 }));
  }

  private syncEntryCount(): void {
    this.statsState.update((stats) => ({ ...stats, entries: this.entries.size }));
  }
}

/**
 * Collection segment of an API URL: both `/api/tasks` and `/api/tasks/task-001`
 * yield `/api/tasks`. Assumes a flat collection layout, which the mock API has.
 */
function collectionPathOf(url: string): string | null {
  const path = url.split('?')[0];
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const apiIndex = segments.indexOf('api');
  const collectionIndex = apiIndex >= 0 ? apiIndex + 1 : 0;

  if (collectionIndex >= segments.length) {
    return null;
  }

  return `/${segments.slice(0, collectionIndex + 1).join('/')}`;
}

function keyTargetsCollection(key: string, collection: string): boolean {
  const url = key.slice(key.indexOf(' ') + 1);
  return url.startsWith(collection);
}
