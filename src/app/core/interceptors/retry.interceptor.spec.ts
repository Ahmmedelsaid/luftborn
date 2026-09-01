import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError } from '../api/api-error';
import { httpOptions } from '../api/api.config';
import { errorInterceptor } from './error.interceptor';
import { retryInterceptor } from './retry.interceptor';

/** Longer than the capped backoff, so one advance always releases a pending retry. */
const PAST_MAX_BACKOFF_MS = 5_000;

describe('retryInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // Same order as `app.config.ts`: the error interceptor normalises the
        // failure first, so retry can read `ApiError.retryable`.
        provideHttpClient(withInterceptors([retryInterceptor, errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /** Subscribes and returns a promise that settles either way. */
  function send(request = http.get('/api/tasks')): Promise<{ ok: boolean; value: unknown }> {
    return new Promise((resolve) =>
      request.subscribe({
        next: (value) => resolve({ ok: true, value }),
        error: (error: unknown) => resolve({ ok: false, value: error }),
      }),
    );
  }

  /** Releases the backoff timer so the queued retry is issued. */
  async function releaseBackoff(): Promise<void> {
    await vi.advanceTimersByTimeAsync(PAST_MAX_BACKOFF_MS);
  }

  it('does not retry a request that succeeds first time', async () => {
    const result = send();

    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    await expect(result).resolves.toEqual({ ok: true, value: [{ id: 'task-001' }] });
    backend.verify();
  });

  it('retries a 503 and succeeds on the second attempt', async () => {
    const result = send();

    backend.expectOne('/api/tasks').flush('down', { status: 503, statusText: 'Unavailable' });
    await releaseBackoff();

    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    await expect(result).resolves.toEqual({ ok: true, value: [{ id: 'task-001' }] });
  });

  it('gives up after the configured number of attempts', async () => {
    const result = send();

    // 1 initial attempt + 2 retries (DEFAULT_RETRY_ATTEMPTS).
    for (let attempt = 0; attempt < 3; attempt += 1) {
      backend.expectOne('/api/tasks').flush('down', { status: 503, statusText: 'Unavailable' });
      await releaseBackoff();
    }

    const settled = await result;

    expect(settled.ok).toBe(false);
    expect(settled.value).toBeInstanceOf(ApiRequestError);
    backend.verify();
  });

  it('does not retry a 404, which cannot succeed on a repeat', async () => {
    const result = send();

    backend.expectOne('/api/tasks').flush('missing', { status: 404, statusText: 'Not Found' });
    await releaseBackoff();

    const settled = await result;

    expect(settled.ok).toBe(false);
    expect((settled.value as ApiRequestError).kind).toBe('not-found');
    backend.verify();
  });

  it('does not retry a 422 validation failure', async () => {
    const result = send();

    backend.expectOne('/api/tasks').flush({ message: 'bad' }, { status: 422, statusText: 'x' });
    await releaseBackoff();

    expect((await result).ok).toBe(false);
    backend.verify();
  });

  it('retries a network failure, which is usually transient', async () => {
    const result = send();

    backend.expectOne('/api/tasks').error(new ProgressEvent('error'));
    await releaseBackoff();

    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    expect((await result).ok).toBe(true);
  });

  it('does not retry a POST, to avoid creating duplicates', async () => {
    const result = send(http.post('/api/tasks', { title: 'New' }));

    backend.expectOne('/api/tasks').flush('down', { status: 503, statusText: 'Unavailable' });
    await releaseBackoff();

    expect((await result).ok).toBe(false);
    backend.verify();
  });

  it('retries an unsafe method when the request opts in', async () => {
    const result = send(
      http.patch(
        '/api/tasks/task-001',
        { order: 10 },
        { context: httpOptions({ retryUnsafeMethod: true }) },
      ),
    );

    backend.expectOne('/api/tasks/task-001').flush('down', { status: 503, statusText: 'x' });
    await releaseBackoff();

    backend.expectOne('/api/tasks/task-001').flush({ id: 'task-001', order: 10 });

    expect((await result).ok).toBe(true);
  });

  it('skips retrying entirely when the budget is zero', async () => {
    const result = send(http.get('/api/tasks', { context: httpOptions({ retryAttempts: 0 }) }));

    backend.expectOne('/api/tasks').flush('down', { status: 503, statusText: 'x' });
    await releaseBackoff();

    expect((await result).ok).toBe(false);
    backend.verify();
  });

  it('honours a raised retry budget', async () => {
    const result = send(http.get('/api/tasks', { context: httpOptions({ retryAttempts: 4 }) }));

    for (let attempt = 0; attempt < 4; attempt += 1) {
      backend.expectOne('/api/tasks').flush('down', { status: 503, statusText: 'x' });
      await releaseBackoff();
    }

    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    expect((await result).ok).toBe(true);
  });
});
