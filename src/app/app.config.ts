import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withRouterConfig,
} from '@angular/router';

import { DEMO_INTERCEPTORS } from '../demo/demo.providers';
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
      // `DEMO_INTERCEPTORS` is empty here and holds the in-browser stand-in for
      // the API in the GitHub Pages build. It goes last, in the network's own
      // position, so everything above it behaves identically either way.
      withInterceptors([
        cacheInterceptor,
        retryInterceptor,
        errorInterceptor,
        ...DEMO_INTERCEPTORS,
      ]),
    ),
    provideAppIcons(),
    // Runtime language switching rather than build-time locales: the brief asks
    // for i18n as a feature, and a switch the user can see beats one bundle per
    // language that needs a redeploy to demonstrate.
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: 'i18n/', suffix: '.json' }),
    }),
  ],
};
