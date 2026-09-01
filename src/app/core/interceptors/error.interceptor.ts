/**
 * Normalises every HTTP failure into an {@link ApiRequestError}.
 *
 * Registered last, so it sits closest to the backend and classifies a failure
 * before `retryInterceptor` sees it on the way back up.
 */

import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';
import { ApiRequestError } from '../api/api-error';

export const errorInterceptor: HttpInterceptorFn = (request, next) =>
  next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof ApiRequestError) {
        return throwError(() => error);
      }

      if (error instanceof HttpErrorResponse) {
        return throwError(() => ApiRequestError.fromHttpError(error));
      }

      return throwError(
        () =>
          new ApiRequestError({
            status: 0,
            kind: 'unknown',
            url: request.url,
            message: 'An unexpected error occurred. Please try again.',
            retryable: false,
          }),
      );
    }),
  );
