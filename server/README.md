# Mock API (`server/`)

A [json-server](https://github.com/typicode/json-server) instance that turns the
assignment fixtures into a real HTTP REST API on `http://localhost:3000/api`.

| File             | Purpose                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `db.js`          | Database factory. Reads `data-fetching/*.json` and derives the `users` / `activities` collections. In-memory, so the committed fixtures are never mutated. |
| `routes.json`    | Rewrites `/api/*` onto json-server's root so the client talks to a namespaced API.                                                                         |
| `middlewares.js` | Artificial latency + opt-in failure injection.                                                                                                             |

## Endpoints

| Method        | Path              | Notes                                                                                                        |
| ------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET`         | `/api/tasks`      | Supports json-server queries: `?status=todo`, `?_sort=dueDate&_order=asc`, `?q=search`, `?_page=1&_limit=20` |
| `POST`        | `/api/tasks`      | Creates a task                                                                                               |
| `PATCH`/`PUT` | `/api/tasks/:id`  | Updates a task                                                                                               |
| `DELETE`      | `/api/tasks/:id`  | Deletes a task                                                                                               |
| `GET`         | `/api/users`      | Assignees derived from the task fixtures                                                                     |
| `GET`         | `/api/activities` | Activity feed (`?_sort=timestamp&_order=desc&_limit=10`)                                                     |
| `POST`        | `/api/activities` | Appends an activity entry                                                                                    |
| `GET`         | `/api/statistics` | Dashboard statistic cards                                                                                    |
| `GET`         | `/api/meta`       | Dataset metadata                                                                                             |

## Configuration

| Variable              | Default | Effect                                                                              |
| --------------------- | ------- | ----------------------------------------------------------------------------------- |
| `MOCK_API_DELAY_MS`   | `300`   | Latency added to every response. Set to `0` for instant responses (used by CI).     |
| `MOCK_API_ERROR_RATE` | `0`     | Probability (`0`–`1`) that a request fails with `503`. Use to exercise retry logic. |

Any request also accepts `?__fail=<status>` to force a single failure response,
e.g. `GET /api/tasks?__fail=500`.
