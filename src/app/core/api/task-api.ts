import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable, Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { Task, TaskDraft, TaskPatch, ResourceFactoryOptions } from '../interfaces';
import { API_BASE_URL, httpOptions, noCache } from './api.config';
import { createId } from './id.util';

/** Guards against a response shape change surfacing far from its cause. */
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

  tasksResource(options?: ResourceFactoryOptions): HttpResourceRef<Task[]> {
    return httpResource<Task[]>(() => this.collectionUrl, {
      defaultValue: [],
      parse: parseTaskCollection,
      debugName: 'tasks',
      injector: options?.injector,
    });
  }

  /** Stays idle while `id()` is undefined, so it can bind straight to a route param. */
  taskResource(
    id: Signal<string | undefined>,
    options?: ResourceFactoryOptions,
  ): HttpResourceRef<Task | undefined> {
    return httpResource<Task>(
      () => {
        const taskId = id();
        return taskId ? `${this.collectionUrl}/${taskId}` : undefined;
      },
      { debugName: 'task', injector: options?.injector },
    );
  }

  /** Builds the full task an optimistic insert renders before the POST lands. */
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

  /** Retries are safe here: writing the same `order` twice is idempotent. */
  updateOrder(id: string, order: number): Observable<Task> {
    return this.http.patch<Task>(
      `${this.collectionUrl}/${id}`,
      { order },
      { context: httpOptions({ cacheTtlMs: 0, retryUnsafeMethod: true }) },
    );
  }
}
