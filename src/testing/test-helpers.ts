/** Shared TestBed wiring for specs that need HTTP, a frozen clock, or both. */

import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentProviders, Provider } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_BASE_URL } from '../app/core/api/api.config';
import { cacheInterceptor } from '../app/core/interceptors/cache.interceptor';
import { errorInterceptor } from '../app/core/interceptors/error.interceptor';
import { retryInterceptor } from '../app/core/interceptors/retry.interceptor';
import { CLOCK } from '../app/core/utils/date.utils';
import { TEST_NOW } from './task.factory';

/** Base URL the specs assert against. */
export const TEST_API_BASE_URL = '/api';

/** Freezes {@link CLOCK} so every date derivation is deterministic. */
export function provideFrozenClock(now: Date = TEST_NOW): Provider {
  return { provide: CLOCK, useValue: () => now };
}

/**
 * HTTP testing backend without the app's interceptors, for specs that assert on
 * a service's own requests and do not want caching or retries in the way.
 */
export function provideTestHttp(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE_URL },
  ];
}

/**
 * HTTP testing backend with the real interceptor chain, in the same order as
 * `app.config.ts`, so the interceptor specs exercise the actual wiring.
 */
export function provideTestHttpWithInterceptors(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([cacheInterceptor, retryInterceptor, errorInterceptor])),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE_URL },
  ];
}

/**
 * HTTP testing backend with only `errorInterceptor`.
 *
 * What the stores actually depend on is normalised errors, not caching or
 * retries. Wiring just that one interceptor keeps store specs honest about the
 * contract while leaving retry backoff timers and cache hits out of the way.
 */
export function provideTestHttpWithErrorNormalisation(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE_URL },
  ];
}

/** Convenience accessor for the mock HTTP backend. */
export function httpBackend(): HttpTestingController {
  return TestBed.inject(HttpTestingController);
}

/** Runs Angular's reactive queue, so pending effects execute. */
export function flushEffects(): void {
  TestBed.tick();
}

/**
 * Flushes effects and lets pending promises resolve.
 *
 * `httpResource` starts its request from an effect and the stores `await` their
 * writes, so both queues have to drain before a spec can assert.
 */
export async function settle(): Promise<void> {
  TestBed.tick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  TestBed.tick();
}
