import { HttpResourceRef } from '@angular/common/http';
import { computed, Signal } from '@angular/core';
import { ApiError, isApiError } from '../interfaces';

/**
 * The resource's value, or `fallback` while it is in the error state.
 *
 * Reading `resource.value()` throws in the error state even with a
 * `defaultValue` set, which would take the whole view down instead of rendering
 * an error panel. Every store reads through here.
 */
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

/** Patches only when the resource holds a value; `update()` throws otherwise. */
export function patchResource<T>(resource: HttpResourceRef<T>, updater: (value: T) => T): boolean {
  if (!resource.hasValue()) {
    return false;
  }

  resource.update(updater);
  return true;
}
