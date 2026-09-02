import {
  HttpErrorResponse,
  HttpEvent,
  HttpInterceptorFn,
  HttpResponse,
} from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';
import demoDatabase from './demo-data.json';

/**
 * Answers `/api` from a dataset held in the tab, for the GitHub Pages demo.
 *
 * Pages serves files and runs no processes, so json-server cannot live there.
 * Rather than ship a read-only demo, this stands in for it: reads come from the
 * bundled snapshot of `server/db.js`, and writes mutate that snapshot in memory
 * so creating, editing, deleting and reordering all behave as they do locally.
 *
 * Two consequences worth knowing, both documented in the README: the data is
 * per-visitor, and a reload restores the original dataset.
 */

interface Row {
  id: string;
  [key: string]: unknown;
}

const LATENCY_MS = 120;

/** Cloned so a reload restores the shipped dataset rather than a mutated one. */
const collections: Record<string, Row[]> = {
  tasks: structuredClone(demoDatabase.tasks),
  users: structuredClone(demoDatabase.users),
  activities: structuredClone(demoDatabase.activities),
  statistics: structuredClone(demoDatabase.statistics),
};

function respond<T>(body: T, status = 200): Observable<HttpEvent<T>> {
  return of(new HttpResponse<T>({ body, status })).pipe(delay(LATENCY_MS));
}

function fail(status: number, message: string, url: string): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status, error: { message }, url })).pipe(
    delay(LATENCY_MS),
  );
}

/**
 * Only a primitive can be ordered. Anything else sorts as empty rather than as
 * the `[object Object]` that stringifying it would silently produce.
 */
function sortKey(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
    ? String(value)
    : '';
}

/**
 * Applies the subset of json-server's query language the app actually uses:
 * the activity feed asks for `_sort`, `_order` and `_limit`.
 */
function applyQuery(rows: Row[], params: URLSearchParams): Row[] {
  let result = [...rows];

  const sort = params.get('_sort');
  if (sort) {
    const descending = params.get('_order') === 'desc';
    result.sort((a, b) => {
      const left = sortKey(a[sort]);
      const right = sortKey(b[sort]);
      return descending ? right.localeCompare(left) : left.localeCompare(right);
    });
  }

  const limit = Number.parseInt(params.get('_limit') ?? '', 10);
  if (Number.isFinite(limit) && limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

/** `/api/tasks/task-001?x=1` -> `{ name: 'tasks', id: 'task-001' }` */
function route(url: string): { name: string; id: string | null; params: URLSearchParams } | null {
  const [path, query = ''] = url.split('?');
  const match = /\/api\/([^/]+)(?:\/([^/]+))?\/?$/.exec(path);

  if (!match) {
    return null;
  }

  return { name: match[1], id: match[2] ?? null, params: new URLSearchParams(query) };
}

export const demoBackendInterceptor: HttpInterceptorFn = (request, next) => {
  if (!request.url.includes('/api/')) {
    return next(request);
  }

  const target = route(request.url);

  if (!target) {
    return next(request);
  }

  const { name, id, params } = target;
  const rows = collections[name];

  if (!rows) {
    return fail(404, `No collection named "${name}".`, request.url);
  }

  switch (request.method) {
    case 'GET': {
      if (id) {
        const found = rows.find((row) => row.id === id);
        return found ? respond(found) : fail(404, `No ${name} with id ${id}.`, request.url);
      }

      return respond(applyQuery(rows, params));
    }

    case 'POST': {
      const created = request.body as Row;
      rows.push(created);
      return respond(created, 201);
    }

    case 'PATCH':
    case 'PUT': {
      const index = rows.findIndex((row) => row.id === id);

      if (index === -1) {
        return fail(404, `No ${name} with id ${id}.`, request.url);
      }

      rows[index] = { ...rows[index], ...(request.body as Partial<Row>) };
      return respond(rows[index]);
    }

    case 'DELETE': {
      const index = rows.findIndex((row) => row.id === id);

      if (index === -1) {
        return fail(404, `No ${name} with id ${id}.`, request.url);
      }

      rows.splice(index, 1);
      return respond({});
    }

    default:
      return fail(405, `${request.method} is not supported by the demo backend.`, request.url);
  }
};
