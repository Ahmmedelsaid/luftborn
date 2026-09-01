import {
  EnvironmentProviders,
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { APP_ICONS } from './icon-set';

/** Registers {@link APP_ICONS} with `MatIconRegistry` during bootstrap. */
export function provideAppIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideAppInitializer(() => {
      const registry = inject(MatIconRegistry);
      const sanitizer = inject(DomSanitizer);

      for (const [name, markup] of Object.entries(APP_ICONS)) {
        // Compile-time constants, never user input.
        registry.addSvgIconLiteral(name, sanitizer.bypassSecurityTrustHtml(markup));
      }
    }),
  ]);
}
