import { Injector } from '@angular/core';

/** Per-request overrides for the caching and retry interceptors. */
export interface HttpBehaviourOptions {
  readonly cacheTtlMs?: number;
  readonly retryAttempts?: number;
  readonly retryUnsafeMethod?: boolean;
}

export interface ResourceFactoryOptions {
  /** Injector to create the resource in, when not called from an injection context. */
  readonly injector?: Injector;
}

export interface HttpCacheStats {
  readonly entries: number;
  readonly hits: number;
  readonly misses: number;
  readonly deduplicated: number;
}
