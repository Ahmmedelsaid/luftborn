import { HttpContext, HttpContextToken } from '@angular/common/http';
import { InjectionToken, Injector } from '@angular/core';

/** Relative by default, so the dev-server proxy forwards it to json-server. */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '/api',
});

export const DEFAULT_CACHE_TTL_MS = 30_000;

/** Additional attempts after the first failure. */
export const DEFAULT_RETRY_ATTEMPTS = 2;

/** Cache lifetime for this request; `0` disables caching. Read by `cacheInterceptor`. */
export const CACHE_TTL_MS = new HttpContextToken<number>(() => DEFAULT_CACHE_TTL_MS);

/** Retry budget for this request. Read by `retryInterceptor`. */
export const RETRY_ATTEMPTS = new HttpContextToken<number>(() => DEFAULT_RETRY_ATTEMPTS);

/**
 * Permits retrying a non-idempotent request. Off by default: retrying a `POST`
 * whose response was merely lost creates duplicate records.
 */
export const RETRY_UNSAFE_METHOD = new HttpContextToken<boolean>(() => false);

export interface HttpBehaviourOptions {
  readonly cacheTtlMs?: number;
  readonly retryAttempts?: number;
  readonly retryUnsafeMethod?: boolean;
}

export function httpOptions(options: HttpBehaviourOptions): HttpContext {
  const context = new HttpContext();

  if (options.cacheTtlMs !== undefined) {
    context.set(CACHE_TTL_MS, options.cacheTtlMs);
  }

  if (options.retryAttempts !== undefined) {
    context.set(RETRY_ATTEMPTS, options.retryAttempts);
  }

  if (options.retryUnsafeMethod !== undefined) {
    context.set(RETRY_UNSAFE_METHOD, options.retryUnsafeMethod);
  }

  return context;
}

export function noCache(): HttpContext {
  return httpOptions({ cacheTtlMs: 0 });
}

export interface ResourceFactoryOptions {
  /** Injector to create the resource in, when not called from an injection context. */
  readonly injector?: Injector;
}
