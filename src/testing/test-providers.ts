/**
 * Wired in via `angular.json -> test.providersFile`. Empty on purpose: the
 * workspace is zoneless, and per-spec concerns come from `src/testing/` helpers
 * so the intent stays visible in the spec that needs them.
 */

import { EnvironmentProviders, Provider } from '@angular/core';

const providers: (Provider | EnvironmentProviders)[] = [];

export default providers;
