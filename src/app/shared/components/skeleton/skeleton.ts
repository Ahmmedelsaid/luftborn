import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shimmering placeholder. Reserving the real shape keeps cumulative layout shift
 * at zero, which a spinner cannot. The shimmer stops under
 * `prefers-reduced-motion`.
 */
@Component({
  selector: 'app-skeleton',
  template: '',
  styles: `
    :host {
      display: block;
      border-radius: var(--app-radius-sm);
      background: linear-gradient(
        90deg,
        var(--app-surface-hover) 25%,
        var(--app-border) 37%,
        var(--app-surface-hover) 63%
      );
      background-size: 400% 100%;
      animation: app-skeleton-shimmer 1.4s ease-in-out infinite;
    }

    @keyframes app-skeleton-shimmer {
      0% {
        background-position: 100% 50%;
      }
      100% {
        background-position: 0 50%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
    '[style.border-radius]': 'radius()',
  },
})
export class Skeleton {
  readonly width = input<string>('100%');
  readonly height = input<string>('16px');
  readonly radius = input<string>('var(--app-radius-sm)');
}
