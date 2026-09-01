import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { httpOptions, noCache } from '../api/api.config';
import { HttpCache } from '../services/http-cache';
import { cacheInterceptor } from './cache.interceptor';

describe('cacheInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let cache: HttpCache;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cacheInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    cache = TestBed.inject(HttpCache);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    backend.verify();
  });

  /** Issues a GET and resolves with its body. */
  function get(url: string): Promise<unknown> {
    return new Promise((resolve, reject) =>
      http.get(url).subscribe({ next: resolve, error: reject }),
    );
  }

  it('serves the second identical GET from cache, making one network call', async () => {
    const first = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);
    await first;

    const second = await get('/api/tasks');

    // No second expectOne: `backend.verify()` in afterEach fails if one was made.
    expect(second).toEqual([{ id: 'task-001' }]);
    expect(cache.stats().hits).toBe(1);
  });

  it('refetches once the ttl has elapsed', async () => {
    const first = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([]);
    await first;

    vi.advanceTimersByTime(31_000);

    const second = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([{ id: 'task-002' }]);

    await expect(second).resolves.toEqual([{ id: 'task-002' }]);
  });

  it('treats different query params as different resources', async () => {
    const todo = new Promise((resolve) =>
      http.get('/api/tasks', { params: { status: 'todo' } }).subscribe(resolve),
    );
    backend.expectOne((request) => request.params.get('status') === 'todo').flush([{ id: 'a' }]);
    await todo;

    const done = new Promise((resolve) =>
      http.get('/api/tasks', { params: { status: 'done' } }).subscribe(resolve),
    );
    backend.expectOne((request) => request.params.get('status') === 'done').flush([{ id: 'b' }]);

    await expect(done).resolves.toEqual([{ id: 'b' }]);
  });

  it('de-duplicates concurrent identical requests into one network call', async () => {
    const first = get('/api/tasks');
    const second = get('/api/tasks');

    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    await expect(Promise.all([first, second])).resolves.toEqual([
      [{ id: 'task-001' }],
      [{ id: 'task-001' }],
    ]);
    expect(cache.stats().deduplicated).toBe(1);
  });

  it('bypasses the cache when the request opts out', async () => {
    const first = new Promise((resolve) =>
      http.get('/api/tasks', { context: noCache() }).subscribe(resolve),
    );
    backend.expectOne('/api/tasks').flush([]);
    await first;

    const second = new Promise((resolve) =>
      http.get('/api/tasks', { context: noCache() }).subscribe(resolve),
    );
    backend.expectOne('/api/tasks').flush([{ id: 'task-003' }]);

    await expect(second).resolves.toEqual([{ id: 'task-003' }]);
  });

  it('honours a per-request ttl', async () => {
    const context = httpOptions({ cacheTtlMs: 1_000 });

    const first = new Promise((resolve) => http.get('/api/tasks', { context }).subscribe(resolve));
    backend.expectOne('/api/tasks').flush([]);
    await first;

    vi.advanceTimersByTime(1_500);

    const second = new Promise((resolve) => http.get('/api/tasks', { context }).subscribe(resolve));
    backend.expectOne('/api/tasks').flush([{ id: 'task-004' }]);

    await expect(second).resolves.toEqual([{ id: 'task-004' }]);
  });

  it('does not cache non-GET requests', async () => {
    const first = new Promise((resolve) =>
      http.post('/api/tasks', { title: 'a' }).subscribe(resolve),
    );
    backend.expectOne('/api/tasks').flush({ id: 'task-001' });
    await first;

    const second = new Promise((resolve) =>
      http.post('/api/tasks', { title: 'b' }).subscribe(resolve),
    );
    backend.expectOne('/api/tasks').flush({ id: 'task-002' });

    await expect(second).resolves.toEqual({ id: 'task-002' });
  });

  it('invalidates the collection after a successful mutation', async () => {
    const load = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);
    await load;

    const patch = new Promise((resolve) =>
      http.patch('/api/tasks/task-001', { status: 'done' }).subscribe(resolve),
    );
    backend.expectOne('/api/tasks/task-001').flush({ id: 'task-001', status: 'done' });
    await patch;

    // The cache was dropped, so this must hit the network again.
    const reload = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([{ id: 'task-001', status: 'done' }]);

    await expect(reload).resolves.toEqual([{ id: 'task-001', status: 'done' }]);
  });

  it('leaves the cache intact when a mutation fails', async () => {
    const load = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);
    await load;

    const patch = new Promise((resolve, reject) =>
      http.patch('/api/tasks/task-001', {}).subscribe({ next: resolve, error: reject }),
    );
    backend.expectOne('/api/tasks/task-001').flush('nope', { status: 500, statusText: 'x' });
    await patch.catch(() => undefined);

    const cached = await get('/api/tasks');

    expect(cached).toEqual([{ id: 'task-001' }]);
  });

  it('does not cache a failed GET', async () => {
    const first = get('/api/tasks').catch(() => 'failed');
    backend.expectOne('/api/tasks').flush('nope', { status: 500, statusText: 'x' });
    await first;

    const second = get('/api/tasks');
    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    await expect(second).resolves.toEqual([{ id: 'task-001' }]);
  });
});
