/** Stubs the browser APIs jsdom lacks but Angular Material touches. */

import { beforeEach, vi } from 'vitest';

function installBrowserApiStubs(): void {
  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
      dispatchEvent: (): boolean => false,
    });
  }

  if (!globalThis.ResizeObserver) {
    /* eslint-disable @typescript-eslint/no-empty-function */
    globalThis.ResizeObserver = class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
    /* eslint-enable @typescript-eslint/no-empty-function */
  }
}

installBrowserApiStubs();

beforeEach(() => {
  vi.clearAllMocks();
});
