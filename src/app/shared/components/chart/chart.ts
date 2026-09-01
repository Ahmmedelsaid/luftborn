import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  ChartType,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { LanguageService } from '../../../core/i18n/language.service';

/**
 * Only the controllers, elements, scales and plugins the app actually draws are
 * registered. `Chart.register(...registerables)` would pull in every chart type
 * Chart.js ships and roughly double the chunk.
 */
Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip,
);

/**
 * Thin Chart.js wrapper.
 *
 * Chart.js draws to a canvas and owns its own instance, so it cannot be driven
 * by change detection. This component keeps one instance alive and updates it
 * in place when the configuration signal changes — replacing the chart on every
 * change would throw away its animation state and leak canvases.
 */
@Component({
  selector: 'app-chart',
  template: `
    <div class="chart__canvas">
      <canvas #canvas [attr.aria-label]="ariaLabel()" role="img"></canvas>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }

    .chart__canvas {
      position: relative;
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartCanvas {
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly language = inject(LanguageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly configuration = input.required<ChartConfiguration>();

  /** Charts are images to assistive technology, so they need a text alternative. */
  readonly ariaLabel = input.required<string>();

  private chart: Chart | null = null;

  constructor() {
    effect(() => {
      const configuration = this.configuration();
      // Re-reading the direction is what redraws the axes mirrored in Arabic.
      const rtl = this.language.direction() === 'rtl';

      this.render(withChartDirection(configuration, rtl));
    });

    this.destroyRef.onDestroy(() => {
      this.chart?.destroy();
      this.chart = null;
    });
  }

  private render(configuration: ChartConfiguration): void {
    if (!this.chart) {
      this.chart = new Chart(this.canvas().nativeElement, configuration);
      return;
    }

    // Chart type cannot change in place, so a different type needs a new chart.
    // `config` is a union that only carries `type` on one arm, hence the read
    // through a narrowed shape rather than a direct property access.
    const currentType = (this.chart.config as { type?: ChartType }).type;

    if (currentType !== configuration.type) {
      this.chart.destroy();
      this.chart = new Chart(this.canvas().nativeElement, configuration);
      return;
    }

    this.chart.data = configuration.data;
    this.chart.options = configuration.options ?? {};
    this.chart.update();
  }
}

/**
 * Applies RTL to the axes, the legend and the tooltip.
 *
 * A pure configuration transform, so it is exported and unit-tested directly —
 * Chart.js itself cannot be instantiated under jsdom, which has no layout for a
 * canvas to measure.
 */
export function withChartDirection(
  configuration: ChartConfiguration,
  rtl: boolean,
): ChartConfiguration {
  const options = configuration.options ?? {};
  const scales = options.scales ?? {};

  return {
    ...configuration,
    options: {
      ...options,
      plugins: {
        ...options.plugins,
        legend: { ...options.plugins?.legend, rtl, textDirection: rtl ? 'rtl' : 'ltr' },
        tooltip: { ...options.plugins?.tooltip, rtl, textDirection: rtl ? 'rtl' : 'ltr' },
      },
      scales: Object.keys(scales).length
        ? {
            ...scales,
            y: scales['y'] ? { ...scales['y'], position: rtl ? 'right' : 'left' } : undefined,
            x: scales['x'] ? { ...scales['x'], reverse: rtl } : undefined,
          }
        : scales,
    },
  };
}

export type { ChartConfiguration, ChartType };
