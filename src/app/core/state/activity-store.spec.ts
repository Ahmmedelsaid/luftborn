import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createActivity, TEST_NOW } from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { Activity } from '../interfaces';
import { ActivityStore } from './activity-store';

async function setupStore(activities: Activity[]): Promise<ActivityStore> {
  const store = TestBed.inject(ActivityStore);
  await settle();

  httpBackend()
    .match((request) => request.url.endsWith('/activities'))
    .forEach((request) => request.flush(activities));

  await settle();
  return store;
}

describe('ActivityStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestHttpWithErrorNormalisation(), provideFrozenClock()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  it('requests the newest entries first, limited server-side', async () => {
    TestBed.inject(ActivityStore);
    await settle();

    const request = httpBackend().expectOne((req) => req.url.endsWith('/activities'));

    expect(request.request.params.get('_sort')).toBe('timestamp');
    expect(request.request.params.get('_order')).toBe('desc');
    expect(request.request.params.get('_limit')).toBe('8');

    request.flush([]);
    await settle();
  });

  it('adds a relative timestamp to every entry', async () => {
    const store = await setupStore([
      createActivity({ id: 'a', timestamp: new Date(2026, 8, 1, 11, 45).toISOString() }),
    ]);

    expect(store.activities()[0].relativeTime).toBe('15 minutes ago');
  });

  it('shows a new entry immediately and reconciles with the server response', async () => {
    const store = await setupStore([]);

    const draft = { ...createActivity({ id: 'ignored' }) };
    const pending = store.record(draft);

    expect(store.activities()).toHaveLength(1);
    expect(store.activities()[0].relativeTime).toBe('just now');

    httpBackend()
      .expectOne((request) => request.method === 'POST')
      .flush(createActivity({ id: 'activity-saved' }));

    await pending;
    await settle();

    expect(store.activities()).toHaveLength(1);
    expect(store.activities()[0].id).toBe('activity-saved');
  });

  it('generates an id for the posted entry', async () => {
    const store = await setupStore([]);

    const pending = store.record({ ...createActivity() });
    const request = httpBackend().expectOne((req) => req.method === 'POST');

    expect((request.request.body as Activity).id).toMatch(/^activity-[0-9a-f]+$/);

    request.flush(createActivity({ id: 'activity-saved' }));
    await pending;
    await settle();
  });

  it('rolls the entry back on failure without surfacing an error', async () => {
    const store = await setupStore([createActivity({ id: 'existing' })]);

    const pending = store.record({ ...createActivity() });
    expect(store.activities()).toHaveLength(2);

    httpBackend()
      .expectOne((request) => request.method === 'POST')
      .flush('nope', { status: 500, statusText: 'Error' });

    // Resolves rather than rejects: losing an audit line must never bubble up as
    // an error over a task mutation that actually succeeded.
    await expect(pending).resolves.toBeUndefined();
    await settle();

    expect(store.activities()).toHaveLength(1);
    expect(store.activities()[0].id).toBe('existing');
  });

  it('exposes the load error', async () => {
    const store = TestBed.inject(ActivityStore);
    await settle();

    httpBackend()
      .expectOne((request) => request.url.endsWith('/activities'))
      .flush('down', { status: 503, statusText: 'Unavailable' });
    await settle();

    expect(store.error()).toBeDefined();
    expect(store.activities()).toEqual([]);
    expect(TEST_NOW).toBeInstanceOf(Date);
  });
});
