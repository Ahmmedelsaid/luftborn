/**
 * Typed HTTP client for `/api/tasks`.
 *
 * Owns transport only — no application state. Reads are exposed as
 * `httpResource`s so the caller gets loading/error signals for free; writes
 * return observables so the store can sequence them and roll back on failure.
 */

import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Task, TaskDraft, TaskPatch } from '../models';
import { API_BASE_URL, httpOptions, noCache, ResourceFactoryOptions } from './api.config';
import { createId } from './id.util';

/**
 * Minimal runtime shape check.
 *
 * Cheap insurance rather than full schema validation: a mock API that starts
 * returning `{ tasks: [...] }` instead of a bare array would otherwise surface
 * as a template error far from the cause.
 */
function parseTaskCollection(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected GET /tasks to return an array.');
  }

  return value.filter(
    (item): item is Task =>
      typeof item === 'object' && item !== null && typeof (item as Task).id === 'string',
  );
}

@Injectable({ providedIn: 'root' })
export class TaskApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private get collectionUrl(): string {
    return `${this.baseUrl}/tasks`;
  }

  /** Reactive resource over the whole collection. */
  tasksResource(options?: ResourceFactoryOptions): HttpResourceRef<Task[]> {
    return httpResource<Task[]>(() => this.collectionUrl, {
      defaultValue: [],
      parse: parseTaskCollection,
      debugName: 'tasks',
      injector: options?.injector,
    });
  }

  /**
   * Reactive single-task resource. Stays idle while `id()` is undefined, which
   * is what makes it safe to bind straight to a route parameter.
   */
  taskResource(
    id: Signal<string | undefined>,
    options?: ResourceFactoryOptions,
  ): HttpResourceRef<Task | undefined> {
    return httpResource<Task>(
      () => {
        const taskId = id();
        return taskId ? `${this.collectionUrl}/${taskId}` : undefined;
      },
      {
        debugName: 'task',
        injector: options?.injector,
      },
    );
  }

  /** Builds the full task an optimistic insert can render before the POST lands. */
  buildTask(draft: TaskDraft, order: number, now: Date): Task {
    const timestamp = now.toISOString();

    return {
      ...draft,
      id: createId('task'),
      order,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(draft.status === 'done' ? { completedAt: timestamp } : {}),
    };
  }

  create(task: Task): Observable<Task> {
    return this.http.post<Task>(this.collectionUrl, task, { context: noCache() });
  }

  update(id: string, patch: TaskPatch): Observable<Task> {
    return this.http.patch<Task>(`${this.collectionUrl}/${id}`, patch, { context: noCache() });
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.collectionUrl}/${id}`, { context: noCache() });
  }

  /**
   * Persists a new manual position. Retries are enabled even though `PATCH` is
   * unsafe: writing the same `order` twice is idempotent, and a dropped reorder
   * is more annoying than a repeated one.
   */
  updateOrder(id: string, order: number): Observable<Task> {
    return this.http.patch<Task>(
      `${this.collectionUrl}/${id}`,
      { order },
      { context: httpOptions({ cacheTtlMs: 0, retryUnsafeMethod: true }) },
    );
  }
}
