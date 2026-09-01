import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';
import { ApiRequestError } from '../api/api-error';
import { RETRY_ATTEMPTS, RETRY_UNSAFE_METHOD } from '../api/api.config';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 4_000;

/** Full jitter, so simultaneous failures do not all retry on the same tick. */
function backoffDelay(attempt: number): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.random() * exponential;
}

/**
 * Retries transient failures with exponential backoff. Defers to
 * `ApiError.retryable` instead of keeping its own list of HTTP statuses.
 */
export const retryInterceptor: HttpInterceptorFn = (request, next) => {
  const allowUnsafe = request.context.get(RETRY_UNSAFE_METHOD);
  const isRetriableMethod = IDEMPOTENT_METHODS.has(request.method) || allowUnsafe;
  const maxAttempts = isRetriableMethod ? request.context.get(RETRY_ATTEMPTS) : 0;

  if (maxAttempts <= 0) {
    return next(request);
  }

  return next(request).pipe(
    retry({
      count: maxAttempts,
      delay: (error: unknown, retryCount: number) => {
        if (error instanceof ApiRequestError && !error.retryable) {
          throw error;
        }

        return timer(backoffDelay(retryCount));
      },
    }),
  );
};
