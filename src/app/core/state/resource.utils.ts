/**
 * Safe accessors over an `httpResource`.
 *
 * Reading `resource.value()` **throws** while the resource is in its error
 * state, even when a `defaultValue` was supplied. Bound directly in a template
 * that means a failed request takes the whole view down instead of rendering an
 * error panel, so every store reads through {@link resourceValue} rather than
 * touching `value()`.
 */

import { HttpResourceRef } from '@angular/common/http';
import { computed, Signal } from '@angular/core';
import { ApiError, isApiError } from '../models';

/** The resource's value, or `fallback` while it is in the error state. */
export function resourceValue<T>(resource: HttpResourceRef<T>, fallback: T): Signal<T> {
  return computed(() => (resource.hasValue() ? resource.value() : fallback));
}

/** The resource's failure as a normalised {@link ApiError}, or `null`. */
export function resourceError(resource: HttpResourceRef<unknown>): Signal<ApiError | null> {
  return computed(() => {
    const error = resource.error();
    return isApiError(error) ? error : null;
  });
}

/**
 * Applies a local patch, but only when the resource actually holds a value.
 *
 * `resource.update()` throws in the error state for the same reason `value()`
 * does, so an optimistic update issued after a failed load would replace one
 * failure with a harder one.
 */
export function patchResource<T>(resource: HttpResourceRef<T>, updater: (value: T) => T): boolean {
  if (!resource.hasValue()) {
    return false;
  }

  resource.update(updater);
  return true;
}
