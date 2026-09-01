import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTask, createUser } from '../../../testing/task.factory';
import {
  httpBackend,
  provideFrozenClock,
  provideTestHttpWithErrorNormalisation,
  settle,
} from '../../../testing/test-helpers';
import { StatisticStore } from './statistic-store';
import { UserStore } from './user-store';

describe('UserStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestHttpWithErrorNormalisation(), provideFrozenClock()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  /** Boots UserStore and answers the users, tasks and activities requests. */
  async function setupStore(): Promise<UserStore> {
    const store = TestBed.inject(UserStore);
    await settle();

    const backend = httpBackend();
    backend
      .match((request) => request.url.endsWith('/users'))
      .forEach((request) =>
        request.flush([
          createUser({ id: 'user-001', name: 'Alice' }),
          createUser({ id: 'user-002', name: 'Bob' }),
        ]),
      );
    backend
      .match((request) => request.url.endsWith('/tasks'))
      .forEach((request) =>
        request.flush([
          createTask({
            id: 'a',
            status: 'done',
            assignee: { ...createUser({ id: 'user-001', name: 'Alice' }) },
          }),
          createTask({
            id: 'b',
            status: 'todo',
            assignee: { ...createUser({ id: 'user-001', name: 'Alice' }) },
          }),
        ]),
      );
    backend
      .match((request) => request.url.endsWith('/activities'))
      .forEach((request) => request.flush([]));

    await settle();
    return store;
  }

  it('loads the users', async () => {
    const store = await setupStore();

    expect(store.users()).toHaveLength(2);
    expect(store.isLoading()).toBe(false);
  });

  it('derives workloads from the current task collection', async () => {
    const store = await setupStore();
    const alice = store.workloads().find((user) => user.id === 'user-001');

    expect(alice?.totalTasks).toBe(2);
    expect(alice?.doneTasks).toBe(1);
    expect(alice?.completionRate).toBe(50);
  });

  it('gives an unassigned user a zero workload', async () => {
    const store = await setupStore();
    const bob = store.workloads().find((user) => user.id === 'user-002');

    expect(bob?.totalTasks).toBe(0);
    expect(bob?.completionRate).toBe(0);
  });

  it('caches users far longer than the default ttl', async () => {
    TestBed.inject(UserStore);
    await settle();

    const request = httpBackend().match((req) => req.url.endsWith('/users'))[0];

    expect(request).toBeDefined();
    request.flush([]);

    httpBackend()
      .match(() => true)
      .forEach((pending) => pending.flush([]));
    await settle();
  });

  it('exposes a normalised load error', async () => {
    const store = TestBed.inject(UserStore);
    await settle();

    httpBackend()
      .match((request) => request.url.endsWith('/users'))
      .forEach((request) => request.flush('down', { status: 503, statusText: 'Unavailable' }));
    httpBackend()
      .match(() => true)
      .forEach((request) => request.flush([]));
    await settle();

    expect(store.error()?.kind).toBe('server');
  });
});

describe('StatisticStore', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTestHttpWithErrorNormalisation(), provideFrozenClock()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true });
  });

  it('loads the statistic cards verbatim from the api', async () => {
    const store = TestBed.inject(StatisticStore);
    await settle();

    httpBackend()
      .expectOne((request) => request.url.endsWith('/statistics'))
      .flush([{ id: 'stat-001', title: 'Total Tasks', value: 156 }]);
    await settle();

    expect(store.statistics()).toHaveLength(1);
    expect(store.statistics()[0].value).toBe(156);
  });

  it('exposes a normalised load error', async () => {
    const store = TestBed.inject(StatisticStore);
    await settle();

    httpBackend()
      .expectOne((request) => request.url.endsWith('/statistics'))
      .flush('down', { status: 500, statusText: 'Error' });
    await settle();

    expect(store.error()?.kind).toBe('server');
    expect(store.statistics()).toEqual([]);
  });
});
