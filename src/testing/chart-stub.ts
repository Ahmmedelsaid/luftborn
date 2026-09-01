import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ChartConfiguration } from 'chart.js';

/**
 * Stand-in for `ChartCanvas` in component specs.
 *
 * Chart.js measures its canvas through `getComputedStyle`, which jsdom cannot
 * satisfy — there is no layout. Swapping the wrapper out lets a page spec assert
 * the configuration it derives, which is the part worth testing; the real canvas
 * is verified by driving the app in a browser.
 */
@Component({
  selector: 'app-chart',
  template: '<span class="chart-stub" [attr.data-type]="configuration().type"></span>',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartStub {
  readonly configuration = input.required<ChartConfiguration>();
  readonly ariaLabel = input.required<string>();
}
