/**
 * Providers injected into every `TestBed`, wired in via
 * `angular.json -> test.providersFile`.
 *
 * Deliberately empty: the workspace is zoneless so `TestBed` already runs
 * without Zone.js, and per-spec concerns (HTTP, the clock) are provided from
 * `src/testing/` helpers so the intent stays visible in the spec that needs it.
 */

import { EnvironmentProviders, Provider } from '@angular/core';

const providers: (Provider | EnvironmentProviders)[] = [];

export default providers;
