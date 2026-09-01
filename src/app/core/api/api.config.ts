/**
 * HTTP layer configuration: the API base URL as an injection token, plus
 * `HttpContextToken`s that let an individual request tune caching and retry
 * without any interceptor needing to know about specific endpoints.
 */

import { HttpContext, HttpContextToken } from '@angular/common/http';
import { InjectionToken, Injector } from '@angular/core';

/**
 * Base URL for the mock API. Relative by default, so the dev-server proxy
 * forwards it to json-server and the built bundle contains no environment-
 * specific host.
 */
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  factory: () => '/api',
});

export const DEFAULT_CACHE_TTL_MS = 30_000;

/** Default number of *additional* attempts after the first failure. */
export const DEFAULT_RETRY_ATTEMPTS = 2;

/** Cache lifetime in milliseconds for this request; `0` disables caching. */
export const CACHE_TTL_MS = new HttpContextToken<number>(() => DEFAULT_CACHE_TTL_MS);

/** Additional attempts for this request after the first failure. */
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

/** Builds an `HttpContext` from a plain options object. */
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

/** Shorthand for a request that must always hit the network. */
export function noCache(): HttpContext {
  return httpOptions({ cacheTtlMs: 0 });
}

/** Options accepted by the `httpResource` factories on each API client. */
export interface ResourceFactoryOptions {
  /** Injector to create the resource in, when not called from an injection context. */
  readonly injector?: Injector;
}
