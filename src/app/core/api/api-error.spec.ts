import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';
import { isApiError } from '../interfaces';
import { ApiRequestError } from './api-error';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, url: '/api/tasks' });
}

describe('ApiRequestError.fromHttpError', () => {
  it.each([
    [0, 'offline'],
    [404, 'not-found'],
    [408, 'timeout'],
    [422, 'validation'],
    [500, 'server'],
    [503, 'server'],
    [504, 'timeout'],
  ] as const)('classifies status %i as %s', (status, kind) => {
    expect(ApiRequestError.fromHttpError(httpError(status)).kind).toBe(kind);
  });

  it.each([0, 408, 429, 500, 502, 503, 504])('marks status %i as retryable', (status) => {
    expect(ApiRequestError.fromHttpError(httpError(status)).retryable).toBe(true);
  });

  it.each([400, 401, 403, 404, 409, 422])('marks status %i as not retryable', (status) => {
    expect(ApiRequestError.fromHttpError(httpError(status)).retryable).toBe(false);
  });

  it('keeps a 4xx server message, which is actionable', () => {
    const error = ApiRequestError.fromHttpError(
      httpError(422, { message: 'Title already exists' }),
    );

    expect(error.message).toBe('Title already exists');
  });

  it('reads a message from an `error` or `detail` field too', () => {
    expect(ApiRequestError.fromHttpError(httpError(400, { error: 'Bad title' })).message).toBe(
      'Bad title',
    );
    expect(ApiRequestError.fromHttpError(httpError(400, { detail: 'Bad date' })).message).toBe(
      'Bad date',
    );
  });

  it('accepts a short plain-text 4xx body', () => {
    expect(ApiRequestError.fromHttpError(httpError(400, 'Invalid payload')).message).toBe(
      'Invalid payload',
    );
  });

  it('never surfaces a 5xx body, which could leak internals', () => {
    const error = ApiRequestError.fromHttpError(
      httpError(500, { message: 'NullPointerException at TaskRepository.java:412' }),
    );

    expect(error.message).not.toContain('NullPointerException');
    expect(error.message).toBe('Something went wrong on our side. Please try again in a moment.');
  });

  it('ignores an unusably long 4xx body', () => {
    const error = ApiRequestError.fromHttpError(httpError(400, 'x'.repeat(500)));

    expect(error.message).not.toContain('xxxx');
  });

  it('falls back to the canned message when the body has no usable field', () => {
    expect(ApiRequestError.fromHttpError(httpError(400, { code: 17 })).message).toBe(
      'The request could not be completed. Please review the details and try again.',
    );
  });

  it('is a real Error, so stacks and instanceof both work', () => {
    const error = ApiRequestError.fromHttpError(httpError(500));

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error.name).toBe('ApiRequestError');
    expect(error.stack).toBeDefined();
  });

  it('satisfies the structural ApiError guard', () => {
    expect(isApiError(ApiRequestError.fromHttpError(httpError(500)))).toBe(true);
  });

  it('carries the failing url through for logging', () => {
    expect(ApiRequestError.fromHttpError(httpError(500)).url).toBe('/api/tasks');
  });
});
