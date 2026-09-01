import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApiRequestError } from '../api/api-error';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  it('leaves a successful response untouched', async () => {
    const promise = new Promise<unknown>((resolve) => http.get('/api/tasks').subscribe(resolve));

    backend.expectOne('/api/tasks').flush([{ id: 'task-001' }]);

    await expect(promise).resolves.toEqual([{ id: 'task-001' }]);
  });

  it('converts an HttpErrorResponse into an ApiRequestError', async () => {
    const promise = new Promise<unknown>((_, reject) =>
      http.get('/api/tasks').subscribe({ error: reject }),
    );

    backend.expectOne('/api/tasks').flush('Boom', { status: 500, statusText: 'Server Error' });

    const error = await promise.catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect((error as ApiRequestError).kind).toBe('server');
  });

  it('reports a network failure as offline with status 0', async () => {
    const promise = new Promise<unknown>((_, reject) =>
      http.get('/api/tasks').subscribe({ error: reject }),
    );

    backend.expectOne('/api/tasks').error(new ProgressEvent('error'));

    const error = (await promise.catch((caught: unknown) => caught)) as ApiRequestError;

    expect(error.kind).toBe('offline');
    expect(error.status).toBe(0);
    expect(error.retryable).toBe(true);
  });

  it('never exposes a raw payload in the user-facing message', async () => {
    const promise = new Promise<unknown>((_, reject) =>
      http.get('/api/tasks').subscribe({ error: reject }),
    );

    backend
      .expectOne('/api/tasks')
      .flush({ stack: 'at TaskRepository.load (repo.java:12)' }, { status: 500, statusText: 'x' });

    const error = (await promise.catch((caught: unknown) => caught)) as ApiRequestError;

    expect(error.message).not.toContain('TaskRepository');
  });
});
