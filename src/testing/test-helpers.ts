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

export const TEST_API_BASE_URL = '/api';

/** Freezes {@link CLOCK} so date derivations are deterministic. */
export function provideFrozenClock(now: Date = TEST_NOW): Provider {
  return { provide: CLOCK, useValue: () => now };
}

/** No interceptors: for specs asserting on a service's own requests. */
export function provideTestHttp(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE_URL },
  ];
}

/** The real interceptor chain, in the same order as `app.config.ts`. */
export function provideTestHttpWithInterceptors(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([cacheInterceptor, retryInterceptor, errorInterceptor])),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE_URL },
  ];
}

/** Only `errorInterceptor` — normalised errors are all the stores depend on. */
export function provideTestHttpWithErrorNormalisation(): (Provider | EnvironmentProviders)[] {
  return [
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideHttpClientTesting(),
    { provide: API_BASE_URL, useValue: TEST_API_BASE_URL },
  ];
}

export function httpBackend(): HttpTestingController {
  return TestBed.inject(HttpTestingController);
}

export function flushEffects(): void {
  TestBed.tick();
}

/** Drains both the reactive queue and the microtask queue. */
export async function settle(): Promise<void> {
  TestBed.tick();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  TestBed.tick();
}
