import { HttpParams, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpCache } from './http-cache';

function request(url: string, params: Record<string, string> = {}): HttpRequest<unknown> {
  return new HttpRequest('GET', url, { params: new HttpParams({ fromObject: params }) });
}

function response(body: unknown = { ok: true }): HttpResponse<unknown> {
  return new HttpResponse({ body, status: 200 });
}

describe('HttpCache', () => {
  let cache: HttpCache;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    cache = TestBed.inject(HttpCache);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('keyFor', () => {
    it('includes the method and url', () => {
      expect(cache.keyFor(request('/api/tasks'))).toBe('GET /api/tasks');
    });

    it('distinguishes requests that differ only by params', () => {
      const todo = cache.keyFor(request('/api/tasks', { status: 'todo' }));
      const done = cache.keyFor(request('/api/tasks', { status: 'done' }));

      expect(todo).not.toBe(done);
    });

    it('is stable for identical requests', () => {
      expect(cache.keyFor(request('/api/tasks', { a: '1' }))).toBe(
        cache.keyFor(request('/api/tasks', { a: '1' })),
      );
    });
  });

  describe('get / set', () => {
    it('returns null on a miss and counts it', () => {
      expect(cache.get('GET /api/tasks')).toBeNull();
      expect(cache.stats().misses).toBe(1);
    });

    it('replays a stored response and counts the hit', () => {
      const stored = response();
      cache.set('GET /api/tasks', stored, 1000);

      expect(cache.get('GET /api/tasks')).toBe(stored);
      expect(cache.stats().hits).toBe(1);
    });

    it('ignores a non-positive ttl', () => {
      cache.set('GET /api/tasks', response(), 0);

      expect(cache.get('GET /api/tasks')).toBeNull();
      expect(cache.stats().entries).toBe(0);
    });

    it('expires an entry once its ttl elapses', () => {
      cache.set('GET /api/tasks', response(), 1000);
      vi.advanceTimersByTime(1001);

      expect(cache.get('GET /api/tasks')).toBeNull();
    });

    it('still serves an entry just before it expires', () => {
      cache.set('GET /api/tasks', response(), 1000);
      vi.advanceTimersByTime(999);

      expect(cache.get('GET /api/tasks')).not.toBeNull();
    });

    it('evicts an expired entry rather than leaving it to skew the stats', () => {
      cache.set('GET /api/tasks', response(), 1000);
      vi.advanceTimersByTime(1001);
      cache.get('GET /api/tasks');

      expect(cache.stats().entries).toBe(0);
    });
  });

  describe('in-flight de-duplication', () => {
    it('returns null when nothing is pending', () => {
      expect(cache.getInFlight('GET /api/tasks')).toBeNull();
    });

    it('returns the shared observable and counts the de-duplication', () => {
      const shared = { subscribe: () => undefined } as never;
      cache.setInFlight('GET /api/tasks', shared);

      expect(cache.getInFlight('GET /api/tasks')).toBe(shared);
      expect(cache.stats().deduplicated).toBe(1);
    });

    it('stops sharing once the request settles', () => {
      cache.setInFlight('GET /api/tasks', { subscribe: () => undefined } as never);
      cache.clearInFlight('GET /api/tasks');

      expect(cache.getInFlight('GET /api/tasks')).toBeNull();
    });
  });

  describe('invalidateCollection', () => {
    beforeEach(() => {
      cache.set('GET /api/tasks', response(), 60_000);
      cache.set('GET /api/tasks?status=todo', response(), 60_000);
      cache.set('GET /api/tasks/task-001', response(), 60_000);
      cache.set('GET /api/users', response(), 60_000);
    });

    it('clears every filtered view of the collection', () => {
      cache.invalidateCollection('/api/tasks');

      expect(cache.get('GET /api/tasks')).toBeNull();
      expect(cache.get('GET /api/tasks?status=todo')).toBeNull();
      expect(cache.get('GET /api/tasks/task-001')).toBeNull();
    });

    it('clears the collection when given an item url', () => {
      cache.invalidateCollection('/api/tasks/task-001');

      expect(cache.get('GET /api/tasks')).toBeNull();
      expect(cache.get('GET /api/tasks?status=todo')).toBeNull();
    });

    it('leaves unrelated collections alone', () => {
      cache.invalidateCollection('/api/tasks/task-001');

      expect(cache.get('GET /api/users')).not.toBeNull();
    });

    it('is a no-op for a url with no collection segment', () => {
      cache.invalidateCollection('/api');

      expect(cache.get('GET /api/tasks')).not.toBeNull();
    });
  });

  describe('clear and resetStats', () => {
    it('clear drops every entry', () => {
      cache.set('GET /api/tasks', response(), 60_000);
      cache.clear();

      expect(cache.stats().entries).toBe(0);
      expect(cache.get('GET /api/tasks')).toBeNull();
    });

    it('resetStats zeroes the counters but keeps the data', () => {
      cache.set('GET /api/tasks', response(), 60_000);
      cache.get('GET /api/tasks');
      cache.get('GET /api/missing');

      cache.resetStats();

      expect(cache.stats()).toEqual({ entries: 1, hits: 0, misses: 0, deduplicated: 0 });
      expect(cache.get('GET /api/tasks')).not.toBeNull();
    });
  });
});
