import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';

import { routes } from './app.routes';
import { cacheInterceptor } from './core/interceptors/cache.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { retryInterceptor } from './core/interceptors/retry.interceptor';
import { provideAppIcons } from './shared/icons/provide-icons';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Route and query params bind straight to component inputs, which keeps
      // deep-linkable state out of every component's constructor.
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
      withRouterConfig({ paramsInheritanceStrategy: 'always' }),
    ),
    provideHttpClient(
      withFetch(),
      // Order matters. Requests travel down this list and responses back up, so
      // `errorInterceptor` normalises a failure before `retryInterceptor` decides
      // whether to retry it, and a cache hit short-circuits both.
      withInterceptors([cacheInterceptor, retryInterceptor, errorInterceptor]),
    ),
    provideAppIcons(),
  ],
};
