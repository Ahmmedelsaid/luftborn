# Task Management Dashboard

A task management dashboard built with Angular 21 for the Luftborn front-end
assignment. Kanban board with drag and drop, filtering and sorting, a validated
task form, analytics charts, and a full Arabic/English interface with real RTL
layout.

```bash
npm install
npm run dev          # mock API on :3000 + dev server on :4200
```

Then open <http://localhost:4200>.

---

## Contents

- [What it does](#what-it-does)
- [Stack](#stack)
- [Architecture](#architecture)
- [State management](#state-management)
- [The HTTP layer](#the-http-layer)
- [Internationalisation and RTL](#internationalisation-and-rtl)
- [Styling](#styling)
- [Setup and installation](#setup-and-installation)
- [Environment configuration](#environment-configuration)
- [Available scripts](#available-scripts)
- [Testing strategy](#testing-strategy)
- [Performance](#performance)
- [Docker](#docker)
- [CI](#ci)
- [Git workflow](#git-workflow)
- [Deliberate departures from the design](#deliberate-departures-from-the-design)
- [Known limitations](#known-limitations)
- [Future improvements](#future-improvements)

---

## What it does

| Route        | What's there                                                                           |
| ------------ | -------------------------------------------------------------------------------------- |
| `/dashboard` | Statistic cards, the Kanban board, recent activity feed                                |
| `/tasks`     | The board with filter bar, plus `/tasks/new` and `/tasks/:id/edit` as full-page routes |
| `/calendar`  | Tasks grouped by due date                                                              |
| `/analytics` | Completion trend and distribution charts                                               |
| `/team`      | Per-member workload derived from task assignment                                       |
| `/settings`  | Language switch and live HTTP cache statistics                                         |

Every route is lazy-loaded. Unknown paths render a not-found page inside the
shell rather than dumping the user out of the app.

**Board.** Four columns (To Do, In Progress, Review, Done). Cards drag between
columns and reorder within one. A drop writes optimistically, then reconciles
against the server response; a failure rolls the card back to where it was.

**Filtering and sorting.** Search, status, priority and assignee, combined; sort
by due date, priority, title or creation date. Filters are held in the store, so
navigating away and back preserves them.

**Task form.** Typed reactive form with a `FormArray` for tags and cross-field
validation (a high-priority task must have a due date; a task marked done cannot
be due later; the due date must be within a five-year horizon and not in the
past). Opens as a dialog from the board and as a full page at `/tasks/new` —
same component, two hosts.

**Statistic cards** are also filter shortcuts: clicking "Overdue" filters the
board to overdue tasks.

---

## Stack

|           |                                                                                         |
| --------- | --------------------------------------------------------------------------------------- |
| Framework | Angular 21.2 — standalone components, **zoneless** change detection, signals throughout |
| UI        | Angular Material 21 + CDK (Material 3)                                                  |
| Charts    | Chart.js 4                                                                              |
| i18n      | `@ngx-translate/core` 17, runtime language switching                                    |
| Mock API  | json-server 0.17.4                                                                      |
| Tests     | Vitest 4 + jsdom                                                                        |
| Tooling   | ESLint 9 (flat config) + `angular-eslint` 21, Prettier 3, Husky                         |

No state management library, no utility CSS framework, no component library
beyond Material. Everything else is 76 first-party TypeScript files.

### Why zoneless

`provideZonelessChangeDetection()` removes `zone.js` from the bundle and stops
change detection from running on every timer and event. It only works if state is
genuinely reactive, which is why signals are used everywhere rather than
selectively — there is no `zone.js` safety net to fall back on. Every component
is `ChangeDetectionStrategy.OnPush`, enforced by an ESLint rule rather than by
convention.

---

## Architecture

```
src/
├─ app/
│  ├─ core/                   # no UI, no templates
│  │  ├─ api/                 # one client per collection
│  │  ├─ interceptors/        # cache, retry, error
│  │  ├─ state/               # signal stores
│  │  ├─ i18n/                # language service, localise pipe
│  │  ├─ services/            # cache registry, clock
│  │  ├─ utils/               # date and task pure functions
│  │  ├─ validators/          # reusable form validators
│  │  └─ interfaces/
│  ├─ layout/                 # shell, top bar, side nav
│  │  └─ interfaces/
│  ├─ shared/                 # presentational components, pipes, icons
│  │  ├─ components/
│  │  └─ interfaces/
│  └─ features/               # one folder per route, lazy-loaded
├─ styles/                    # tokens, mixins, theme
├─ testing/                   # factories and harness helpers
└─ public/i18n/               # en.json, ar.json
```

Three rules hold this together:

1. **`core/` never imports from `features/` or `shared/`.** Dependencies point
   inwards only, so a feature can be deleted without touching anything else.
2. **`shared/` components take inputs and emit outputs — they never inject a
   store.** That makes them trivial to test and genuinely reusable; `TaskCard`
   doesn't know whether it's on the dashboard or the board.
3. **Interfaces live in their own `interfaces/` folder per tier**, named
   `*.interface.ts` and re-exported through a barrel. A type is a contract
   between layers, so it shouldn't be buried inside whichever file happened to
   need it first.

### Business logic is pure functions

`core/utils/task.utils.ts` holds `filterTasks`, `sortTasks`,
`groupTasksByStatus`, `computeTaskTotals` and `computeUserWorkloads`. None of
them inject anything. Components and stores compose them inside `computed()`.

The reason is testability: filtering and sorting is where the real logic lives,
and testing it through a component means rendering a DOM to assert on an
algorithm. As pure functions they're covered directly, and the components only
need tests for what they actually own — rendering and interaction.

Time is injected through a `CLOCK` token rather than read from `new Date()`, so
"is this overdue" is deterministic in tests. `parseApiDate` splits date strings
manually instead of using `new Date('2026-09-01')`, which parses as UTC midnight
and lands on the previous day for anyone west of Greenwich.

---

## State management

Four stores — `TaskStore`, `UserStore`, `ActivityStore`, `StatisticStore` — each
a `providedIn: 'root'` service wrapping an `httpResource` and exposing signals.

```
httpResource ──> resourceValue() ──> computed() chain ──> component
     ▲                                                        │
     └──────────── optimistic patch / rollback ◄──────────────┘
```

`httpResource` (Angular 19.2+) is a `WritableResource`: it fetches reactively
from a URL signal, and its value can be written locally with `.set()` /
`.update()`. That's what makes optimistic updates possible without a separate
copy of server state.

Everything downstream is derived. `TaskStore` exposes filters as signals; the
board reads `columns()`, which is a `computed` over filtered, sorted, grouped
tasks. Change a filter and the columns recompute — no subscriptions, no manual
refresh.

### Optimistic updates

Create, update, delete and move all write locally first, fire the request, and
either reconcile with the server's response or roll back on failure:

```ts
const snapshot = current();
patchResource(this.resource, (tasks) => applyMove(tasks, id, status, order));
this.api.move(id, status, order).subscribe({
  next: (saved) => patchResource(this.resource, (tasks) => reconcile(tasks, saved)),
  error: () => patchResource(this.resource, () => snapshot),
});
```

A `pendingIds` signal tracks in-flight mutations so the UI can mark a card as
saving without blocking interaction.

Reordering uses fractional ordering: cards get `order` values spaced by
`ORDER_STEP = 1000`, and a drop between two cards takes the midpoint. That means
a move is a single-row update rather than a renumbering of the whole column.

### One thing worth knowing about `httpResource`

`resource.value()` **and** `resource.update()` both throw when the resource is in
its error state. Reading a signal that throws takes the whole view down with it,
so every access goes through `core/state/resource.utils.ts`:

```ts
export function resourceValue<T>(resource: HttpResourceRef<T>, fallback: T): Signal<T> {
  return computed(() => (resource.hasValue() ? resource.value() : fallback));
}
```

A failed request now shows an error state next to whatever else is on the page,
instead of blanking it.

---

## The HTTP layer

Three functional interceptors, in an order that matters:

```
request  ──> cache ──> retry ──> error ──> backend
response <── cache <── retry <── error <── backend
```

Responses travel back up the chain, so `error` normalises failures into
`ApiRequestError` **before** `retry` decides whether to retry. Put `retry` last
and it would be deciding on raw `HttpErrorResponse` objects instead.

**`cache.interceptor.ts`** — TTL cache for GETs, with in-flight de-duplication:
two components asking for `/api/users` at the same moment share one request
rather than racing. A successful mutation invalidates the collection path, so a
`POST /api/tasks` drops the cached `GET /api/tasks`. TTL is per-request via an
`HttpContextToken`: users 5 minutes, statistics 60 seconds, activities 2 seconds.

**`retry.interceptor.ts`** — exponential backoff with **full jitter** (a random
point in `[0, delay]` rather than the delay itself), so simultaneous failures
don't retry in lockstep. Only idempotent methods retry by default; an unsafe
method has to opt in through `RETRY_UNSAFE_METHOD`.

**`error.interceptor.ts`** — normalises everything to `ApiRequestError` with a
translation key. 4xx keeps the server's message because it's actionable; 5xx
never does, because a stack trace is not a user-facing message.

Cache hits, misses and de-duplications are counted and shown live on the
settings page — easier to trust than a passing test.

---

## Internationalisation and RTL

English and Arabic, switched at runtime with no reload. `LanguageService` sets
`<html lang>` and `<html dir>`, writes Angular CDK's `Directionality` signal so
Material components flip, and persists the choice to `localStorage`.

**RTL is done with CSS logical properties only.** `padding-inline-start`,
`border-inline-start`, `inset-inline-end`, `text-align: start`. There is no
`left` or `right` anywhere in the stylesheets and no `[dir="rtl"]` override
block, so the layout mirrors without a second set of rules to keep in sync.

**Arabic plurals are not English plurals.** Arabic has six plural categories;
`LanguageService.plural()` resolves the right one through `Intl.PluralRules`:

```json
"tasks.count.one": "مهمة واحدة",
"tasks.count.two": "مهمتان",
"tasks.count.few": "{{count}} مهام",
"tasks.count.many": "{{count}} مهمة"
```

That's why `ar.json` has 194 keys against `en.json`'s 170 — the extra 24 are
plural categories English doesn't have.

**Numbers stay LTR.** Bidi reordering turns a `0 / 120` character counter into
`120 / 0` when the surrounding paragraph is RTL. Those runs are wrapped in
`<span dir="ltr">`.

Charts get a direction transform so axes and legends flip with the language.

---

## Styling

SASS, mobile-first, three layers:

- **`_tokens.scss`** — CSS custom properties, values read off the Figma file:
  `--app-primary: #2563eb`, `--app-overdue-bg: #fef3f2`, priority badge colours,
  spacing and radius scales. Custom properties rather than SASS variables so they
  can change at runtime.
- **`_mixins.scss`** — `from()` / `below()` breakpoint helpers, `line-clamp()`,
  `focus-ring`, `surface-card`, `visually-hidden`.
- **`_theme.scss`** — Material 3 via `mat.theme()` with a generated palette,
  plus targeted `mat.*-overrides()` token mixins where a component needed to
  differ from the default.

Every media query goes through `from($breakpoint)`, so breakpoints are declared
once. `Shell` reads the same 1024px value through `BreakpointObserver`, so the
TypeScript and the CSS can't disagree about what "desktop" means.

Icons are the emoji the design uses, rendered as text — see
[deliberate departures](#deliberate-departures-from-the-design).

---

## Setup and installation

**Requirements:** Node 20.19+, 22.12+ or 24+ (Angular 21's supported range;
developed on 24.15) and npm 10+.

```bash
git clone https://github.com/Ahmmedelsaid/luftborn.git
cd luftborn
npm install
npm run dev
```

`npm run dev` runs two processes concurrently:

- **json-server** on `:3000` — the mock API
- **`ng serve`** on `:4200` — the app, proxying `/api` to `:3000` via
  `proxy.conf.json`

To run them separately, use `npm run api` and `npm start` in two terminals.

The fixtures in `data-fetching/` use **relative** due dates, so tasks are always
overdue or due soon regardless of when you clone. Regenerate them with
`npm run generate:data`.

`npm install` also installs Husky's git hooks: `pre-commit` runs
lint-staged, `commit-msg` enforces Conventional Commits.

---

## Environment configuration

No `environment.ts` files. The API base path is `/api` in both development and
production; what differs is who answers it — the dev-server proxy locally, nginx
in the container. That keeps one code path instead of two.

The mock server reads three settings, which exist to make failure states easy to
demonstrate:

| Variable              | Default | Effect                                               |
| --------------------- | ------- | ---------------------------------------------------- |
| `MOCK_API_DELAY_MS`   | `300`   | Artificial latency, so loading skeletons are visible |
| `MOCK_API_ERROR_RATE` | `0`     | Fraction of requests that fail randomly (`0`–`1`)    |

```bash
MOCK_API_ERROR_RATE=0.3 npm run api    # see the retry interceptor work
MOCK_API_DELAY_MS=2000 npm run api     # see the loading states
```

A single request can also be failed on demand with `?__fail=<status>`, which is
how the error states were checked against real responses rather than mocks.

---

## Available scripts

| Script                  | What it does                                           |
| ----------------------- | ------------------------------------------------------ |
| `npm run dev`           | Mock API + dev server together                         |
| `npm start`             | Dev server only                                        |
| `npm run api`           | Mock API only                                          |
| `npm run build`         | Production build to `dist/`                            |
| `npm run build:stats`   | Production build with `stats.json` for bundle analysis |
| `npm test`              | Unit tests once                                        |
| `npm run test:watch`    | Unit tests in watch mode                               |
| `npm run test:coverage` | Unit tests with coverage, fails below 80%              |
| `npm run lint`          | ESLint over TypeScript and templates                   |
| `npm run lint:fix`      | ESLint with autofix                                    |
| `npm run format`        | Prettier write                                         |
| `npm run format:check`  | Prettier check (what CI runs)                          |
| `npm run generate:data` | Regenerate the mock fixtures with fresh dates          |

---

## Testing strategy

**454 specs across 32 files. 87.5% statements, 89.4% branches**, with the gate
set at 80% in `angular.json` — `npm run test:coverage` fails below it, and so
does CI.

Vitest with jsdom, which is Angular 21's default (Karma is deprecated). Four
kinds of test, in rough order of how much they earn:

**1. Pure functions** — `filterTasks`, `sortTasks`, `formatDueLabel`, the
validators. No `TestBed`, no DOM, milliseconds each. This is where the edge
cases live: empty filters, ties in sort order, a task due today versus due at
23:59 today, the DST boundary.

**2. Stores** — `TestBed` with `provideHttpClientTesting()`. Each optimistic
mutation is tested twice: the success path, and the failure path asserting the
rollback actually restored the previous state. Also the case that caused a real
bug — a resource in its error state.

**3. Interceptors** — assert behaviour, not implementation. The cache spec fires
two concurrent requests and asserts `HttpTestingController` saw _one_. The retry
spec asserts the number of attempts and that a `POST` isn't retried without the
opt-in token. The error spec asserts a 500's server message is discarded and a
422's is kept.

**4. Components** — rendered through `TestBed`, asserted through the DOM. A user
clicks a button and sees text; a spec should do the same. Assertions go through
small helpers (`text`, `click`, `exists`) rather than `nativeElement.querySelector`
chains, so a template change breaks one helper rather than forty specs.

### Test infrastructure

`src/testing/` is real infrastructure, not scratch files:

- **`task.factory.ts`** — builders with sensible defaults and a frozen
  `TEST_NOW`, so a spec declares only the field it cares about.
- **`test-helpers.ts`** — `provideFrozenClock`, `provideTestHttp`,
  `provideTestHttpWithInterceptors`, and `settle()` for flushing microtasks under
  zoneless change detection.
- **`translate-helpers.ts`** — `useTranslations()` so specs assert on real
  copy instead of raw keys.
- **`chart-stub.ts`** — Chart.js can't instantiate under jsdom
  (`getComputedStyle` returns an element with a null `ownerDocument`), so chart
  specs swap the canvas component via `TestBed.overrideComponent`.

### And running the actual application

Unit tests didn't catch several real bugs, so the app was also driven
end-to-end in a real browser with Playwright — filling the form, dragging cards,
switching language, watching the console. That found, among others:

- `provideNativeDateAdapter()` scoped to the tasks route was invisible to
  `MatDialog`, because dialogs are created against the **root** environment
  injector. Types were fine and every unit test passed. Fixed by passing
  `injector` to `dialog.open()`.
- `mat-sidenav`'s `closedStart` firing during a breakpoint change, cancelling a
  drawer the user had just opened.
- Bidi reordering of numeric runs in Arabic.

The lesson is in the README because it's the honest one: type checking and unit
tests verify what you thought of. Running the app verifies what you didn't.

---

## Performance

**Initial bundle: 352 kB raw / 97.5 kB transfer.** Verified with
`npm run build`, not estimated.

| Technique                       | Effect                                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| Zoneless change detection       | Drops `zone.js`; change detection runs on signal writes, not on every timer                     |
| `OnPush` everywhere             | Enforced by ESLint, not convention                                                              |
| Route-level lazy loading        | Every feature is its own chunk                                                                  |
| Component-level lazy loading    | The analytics chunk carrying Chart.js (193 kB) and the task form (246 kB) never load until used |
| Signal-derived state            | `computed()` caches; no recomputation when unrelated state changes                              |
| Selective Chart.js registration | Only the controllers and scales actually used are registered                                    |
| In-place chart updates          | `chart.update()` rather than destroy-and-recreate on data change                                |
| HTTP cache + de-duplication     | Navigating back to a visited route serves from cache                                            |
| `track` on every list           | Enforced by ESLint; DOM nodes are reused across reorders                                        |

The two big lazy chunks are the point. Chart.js alone is over half the size of
the entire initial bundle; loading it eagerly to serve a route most visits never
reach would have been the worst option available.

nginx serves the built app with immutable caching on hashed assets and
`no-store` on `index.html`, so a deploy is picked up immediately without any
client re-downloading unchanged chunks.

---

## Docker

Multi-stage build — the Node toolchain never reaches the shipped image, which is
nginx plus static files:

```bash
docker compose up --build      # http://localhost:8080
```

Two services: `web` (nginx serving the build) and `api` (json-server). nginx
proxies `/api` to the API container and falls back to `index.html` for every
other unmatched path, so deep links like `/tasks/new` work on refresh — the
single most common way an SPA deployment breaks. CI asserts that specific case.

Fixtures are regenerated inside the build, so a deployed image never ships stale
relative due dates.

`docker build` + `docker run` on its own also works, but serves the front end
only: there's no API container, so `/api` answers 503 with a message saying to
use compose. A write-capable API can't be a bundle of static JSON, so it isn't
pretended otherwise.

---

## CI

`.github/workflows/ci.yml`, four parallel jobs on every push and pull request to
`main`:

| Job                         | What it enforces                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Lint and format**         | ESLint (TypeScript + templates) and `prettier --check`                                            |
| **Unit tests and coverage** | Full suite; fails below the 80% gate; uploads the coverage report                                 |
| **Production build**        | Regenerates fixtures, builds, uploads `dist/`                                                     |
| **Docker image**            | Builds the image, validates the nginx and compose configs, then smoke-tests the running container |

The docker job is the one worth pointing at: it starts the container and asserts
that `/` serves, that `/tasks/new` returns **200** rather than 404, that
`/i18n/ar.json` is reachable, and that `/api` returns the expected 503 with no
upstream. A Dockerfile that only ever built on one laptop isn't a deliverable.

`concurrency: cancel-in-progress` cancels superseded runs.

---

## Git workflow

Eight branches, each merged to `main` through a GitHub pull request with
`--no-ff`, so the merge commits preserve the shape of the work rather than
flattening it into a straight line:

| PR  | Branch                   | What landed                                                                         |
| --- | ------------------------ | ----------------------------------------------------------------------------------- |
| #1  | `feat/core-domain`       | Tooling, mock API, interfaces, utils, validators, API clients, interceptors, stores |
| #2  | `feat/app-shell`         | Shell, top bar, side nav, routing, theme and token layer                            |
| #3  | `feat/dashboard`         | Statistic cards, Kanban board with drag and drop, filter bar, activity feed         |
| #4  | `feat/task-form`         | Typed reactive form with cross-field validation, as both dialog and page            |
| #5  | `feat/i18n`              | Arabic/English runtime switching, RTL via logical properties, plural rules          |
| #6  | `feat/analytics-team`    | Chart.js integration, analytics charts, team workload                               |
| #7  | `feat/calendar-settings` | Calendar view, settings page with live cache statistics                             |
| #8  | `chore/ci-docker-docs`   | GitHub Actions, Docker and compose, this README                                     |

Conventional Commits throughout, enforced by the `commit-msg` hook rather than
by memory. Commit bodies carry the _why_ — the reasoning behind the interceptor
ordering, the `httpResource` error-state workaround, the dialog injector fix.
`git log` is meant to be readable.

---

## Deliberate departures from the design

One place where the implementation doesn't match the Figma file, on purpose —
and one place it deliberately follows it against my own instinct:

**The mock's emoji are used as the icons.** Navigation and statistic tiles
render the emoji the frames show, and the statistic tiles take theirs straight
from the API payload rather than mapping it to anything. The trade-off is
accepted knowingly: emoji render differently per platform and cannot inherit
`currentColor`. Matching the supplied design won over normalising it, and the
labels beside them carry the accessible name either way.

**Live column counts instead of the mock's numbers.** The Figma frames show
counts of 42 / 25 / 89 which don't add up across frames — they're placeholder
text, not a specification. The columns show the real count of the tasks in them.

Everything else — spacing, the 10px card radius, the overdue card's leading bar
and tinted surface, the neutral due-date text with only the icon coloured, the
uppercase column headers with a rule beneath, typography scale — was matched
against the Figma file at zoom.

---

## Known limitations

**Filtering and sorting are client-side.** All tasks are fetched once and
filtered in memory. That's the right call for a dataset this size — it makes
filtering instant and keeps the store simple — but it doesn't scale. Past a few
thousand tasks it needs to move server-side with pagination. The store's filter
signals are already the seam that change would go through.

**Mock data isn't persistent.** `server/db.js` builds its dataset in memory, so
writes are lost when json-server restarts. Deliberate — it means every run
starts from a known state — but it isn't a database.

**No dark mode.** The token layer is CSS custom properties and the Material
theme is M3, so the plumbing is in place, but no dark palette was defined and no
dark design was provided. Adding it means one `@media (prefers-color-scheme)`
block over the tokens, not a refactor.

**No automated e2e suite.** Playwright was used to drive the app during
development and found real bugs, but those runs were exploratory and aren't
committed as a suite. The unit tests are the automated safety net.

**Accessibility is checked, not audited.** Keyboard navigation, focus management
in the dialog, ARIA labels and the full `angular-eslint` accessibility rule set
are all in place, and contrast was checked against the palette. But no screen
reader was tested end-to-end, and drag and drop — though it has a keyboard path
through the CDK — deserves proper testing with assistive technology.

**Charts aren't fully localised.** Axis labels and legends flip direction with
the language and read from the translation files, but Chart.js tooltips use its
own number formatting rather than `Intl.NumberFormat` with the active locale, so
Arabic sees Western digits in tooltips.

---

## Future improvements

In the order I'd actually do them:

1. **Server-side filtering, sorting and pagination**, behind the filter signals
   that already exist.
2. **A committed Playwright suite** for the flows that broke during development:
   drag and drop, the form in both hosts, the language switch.
3. **Real-time updates.** The stores already reconcile server responses into
   local state, so a WebSocket pushing task changes would flow through the same
   path an optimistic update takes.
4. **Dark mode**, as one media query over the token layer.
5. **`Intl.NumberFormat` and `Intl.DateTimeFormat` throughout**, including inside
   Chart.js callbacks.
6. **An accessibility audit** with a real screen reader, particularly the board.
7. **Bundle budgets in CI**, failing the build on a regression rather than
   noticing one later.
8. **Optimistic-update conflict resolution.** Right now a failed mutation rolls
   back wholesale; with concurrent editors it would need to merge or ask.

---

## License

Written as an assignment submission for Luftborn.
