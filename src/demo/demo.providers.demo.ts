import { HttpInterceptorFn } from '@angular/common/http';
import { demoBackendInterceptor } from './demo-backend.interceptor';

/**
 * Swapped in for `demo.providers.ts` by the `demo` build configuration.
 *
 * It goes last in the interceptor chain, standing in for the network itself, so
 * caching, retrying and error normalisation all behave exactly as they do
 * against the real json-server.
 */
export const DEMO_INTERCEPTORS: HttpInterceptorFn[] = [demoBackendInterceptor];
