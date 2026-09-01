import { HttpEvent, HttpRequest, HttpResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpCacheStats } from '../interfaces';

interface CacheEntry {
  readonly response: HttpResponse<unknown>;
  readonly expiresAt: number;
}

/** TTL cache plus in-flight de-duplication, backing `cacheInterceptor`. */
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

  /** Live statistics, surfaced on the Settings page. */
  readonly stats = this.statsState.asReadonly();

  /** Includes params, since `/tasks?status=todo` is a different resource. */
  keyFor(request: HttpRequest<unknown>): string {
    const params = request.params.toString();
    return params
      ? `${request.method} ${request.url}?${params}`
      : `${request.method} ${request.url}`;
  }

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
   * Clears every cached view of a collection, so `PATCH /api/tasks/task-001`
   * also drops `GET /api/tasks` and its filtered variants.
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

/** Both `/api/tasks` and `/api/tasks/task-001` yield `/api/tasks`. */
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
