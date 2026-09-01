/** Transport types shared by the API clients and the HTTP interceptors. */

/**
 * A normalised HTTP failure. `errorInterceptor` converts every error into this
 * shape so consumers branch on a small closed type and always have something
 * safe to render.
 */
export interface ApiError {
  /** HTTP status, or `0` when the request never reached the server. */
  readonly status: number;
  /** Message intended for the user; never a raw payload or stack trace. */
  readonly message: string;
  readonly kind: ApiErrorKind;
  readonly url: string;
  /** Whether a retry could plausibly succeed. */
  readonly retryable: boolean;
}

export type ApiErrorKind =
  'offline' | 'timeout' | 'not-found' | 'validation' | 'server' | 'unknown';

/** Structural type guard for {@link ApiError}. */
export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'status' in value &&
    'message' in value
  );
}
