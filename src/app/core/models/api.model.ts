/** A transport failure, normalised by `errorInterceptor`. */
export interface ApiError {
  /** HTTP status, or `0` when the request never reached the server. */
  readonly status: number;
  /** Safe to render; never a raw payload or stack trace. */
  readonly message: string;
  readonly kind: ApiErrorKind;
  readonly url: string;
  readonly retryable: boolean;
}

export type ApiErrorKind =
  'offline' | 'timeout' | 'not-found' | 'validation' | 'server' | 'unknown';

export function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'status' in value &&
    'message' in value
  );
}
