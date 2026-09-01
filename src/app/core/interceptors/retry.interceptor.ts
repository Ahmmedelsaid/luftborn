/**
 * Retries transient failures with exponential backoff and jitter.
 *
 * Sits above `errorInterceptor`, so the error it inspects is already an
 * {@link ApiRequestError} and it can defer to `retryable` instead of keeping its
 * own list of HTTP statuses. Unsafe methods are not retried unless the request
 * opts in via {@link RETRY_UNSAFE_METHOD}.
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';
import { RETRY_ATTEMPTS, RETRY_UNSAFE_METHOD } from '../api/api.config';
import { ApiRequestError } from '../api/api-error';

const IDEMPOTENT_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 4_000;

/**
 * Exponential backoff with full jitter. Jitter matters when several requests
 * fail together — without it they all retry on the same tick and hammer a server
 * that is already struggling.
 */
function backoffDelay(attempt: number): number {
  const exponential = Math.min(BASE_DELAY_MS * 2 ** (attempt - 1), MAX_DELAY_MS);
  return Math.random() * exponential;
}

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
