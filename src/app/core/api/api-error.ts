import { HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiErrorKind } from '../models';

const RETRYABLE_STATUSES = new Set([0, 408, 429, 500, 502, 503, 504]);

const MESSAGES: Readonly<Record<ApiErrorKind, string>> = {
  offline: 'You appear to be offline. Check your connection and try again.',
  timeout: 'The request took too long to complete. Please try again.',
  'not-found': 'The item you are looking for no longer exists.',
  validation: 'The request could not be completed. Please review the details and try again.',
  server: 'Something went wrong on our side. Please try again in a moment.',
  unknown: 'An unexpected error occurred. Please try again.',
};

function classify(status: number): ApiErrorKind {
  // Angular reports 0 when the request never left the browser.
  if (status === 0) {
    return 'offline';
  }

  if (status === 408 || status === 504) {
    return 'timeout';
  }

  if (status === 404) {
    return 'not-found';
  }

  if (status >= 400 && status < 500) {
    return 'validation';
  }

  if (status >= 500) {
    return 'server';
  }

  return 'unknown';
}

function extractServerMessage(body: unknown): string | null {
  if (typeof body === 'string' && body.trim().length > 0 && body.length <= 200) {
    return body;
  }

  if (typeof body === 'object' && body !== null) {
    const record = body as Record<string, unknown>;
    const candidate = record['message'] ?? record['error'] ?? record['detail'];

    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

/** A real `Error` subclass, so stacks survive and `instanceof` works. */
export class ApiRequestError extends Error implements ApiError {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly url: string;
  readonly retryable: boolean;

  constructor(init: ApiError) {
    super(init.message);
    this.name = 'ApiRequestError';
    this.status = init.status;
    this.kind = init.kind;
    this.url = init.url;
    this.retryable = init.retryable;
  }

  /** A 4xx keeps the server's message; a 5xx never does, to avoid leaking internals. */
  static fromHttpError(response: HttpErrorResponse): ApiRequestError {
    const kind = classify(response.status);
    const serverMessage = kind === 'validation' ? extractServerMessage(response.error) : null;

    return new ApiRequestError({
      status: response.status,
      kind,
      url: response.url ?? '',
      message: serverMessage ?? MESSAGES[kind],
      retryable: RETRYABLE_STATUSES.has(response.status),
    });
  }
}
