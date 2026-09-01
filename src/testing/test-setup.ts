/** Stubs the browser APIs jsdom lacks but Angular Material touches. */

import { afterEach, beforeEach, vi } from 'vitest';

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

// Overlays (menus, dialogs) are appended to `document.body` and survive the
// fixture, so a menu opened in one spec would still be clickable in the next.
afterEach(() => {
  for (const container of document.querySelectorAll('.cdk-overlay-container')) {
    container.remove();
  }
});
