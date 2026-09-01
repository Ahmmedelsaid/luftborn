/**
 * Caches `GET` responses and de-duplicates in-flight requests.
 *
 * Registered first, so a cache hit short-circuits the rest of the chain and
 * never reaches the network. Mutations pass straight through and invalidate
 * every cached view of the collection they touched.
 */

import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize, of, shareReplay, tap } from 'rxjs';
import { CACHE_TTL_MS } from '../api/api.config';
import { HttpCache } from '../services/http-cache';

export const cacheInterceptor: HttpInterceptorFn = (request, next) => {
  const cache = inject(HttpCache);

  if (request.method !== 'GET') {
    return next(request).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          cache.invalidateCollection(request.url);
        }
      }),
    );
  }

  const ttlMs = request.context.get(CACHE_TTL_MS);

  if (ttlMs <= 0) {
    return next(request);
  }

  const key = cache.keyFor(request);

  const cached = cache.get(key);
  if (cached) {
    return of(cached.clone());
  }

  const pending = cache.getInFlight(key);
  if (pending) {
    return pending;
  }

  const request$ = next(request).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        cache.set(key, event, ttlMs);
      }
    }),
    finalize(() => cache.clearInFlight(key)),
    // `refCount: false` keeps the buffered response available to late
    // subscribers within the same tick, which is the point of de-duplication.
    shareReplay({ bufferSize: 1, refCount: false }),
  );

  cache.setInFlight(key, request$);

  return request$;
};
