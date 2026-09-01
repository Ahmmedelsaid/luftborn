import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Statistic } from '../../../core/interfaces';
import { STATISTIC_ICON_BY_EMOJI } from '../../icons/icon-set';

/**
 * Statistic tile. Renders the API payload as-is, including its accent colour.
 *
 * Optionally acts as a filter shortcut. That is an addition rather than
 * something the frames show, but it keeps the static appearance identical and
 * adds the capability without introducing a control the design does not have.
 */
@Component({
  selector: 'app-stat-card',
  imports: [MatIconModule, NgTemplateOutlet],
  templateUrl: './stat-card.html',
  styleUrl: './stat-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-stat-card',
    '[class.stat--interactive]': 'interactive()',
    '[class.stat--active]': 'active()',
    '[style.--app-stat-color]': 'statistic().color',
  },
})
export class StatCard {
  readonly statistic = input.required<Statistic>();

  /** Renders the tile as a button that emits {@link filter}. */
  readonly interactive = input<boolean>(false);

  /** Highlights the tile when its filter is the one currently applied. */
  readonly active = input<boolean>(false);

  readonly filter = output<Statistic>();

  /** `null` when the emoji has no mapped glyph, so the template can fall back. */
  protected readonly icon = computed<string | null>(
    () => STATISTIC_ICON_BY_EMOJI[this.statistic().icon] ?? null,
  );

  /** The design omits a zero delta and shows only its label. */
  protected readonly delta = computed(() => {
    const { change } = this.statistic();
    return change === '0' || change === '+0' || change === '' ? '' : change;
  });

  protected readonly ariaLabel = computed(() => {
    const stat = this.statistic();
    const base = `${stat.title}: ${stat.value}, ${this.delta()} ${stat.changeLabel}`;
    const suffix = this.interactive() ? '. Activates the matching filter' : '';

    return `${base}${suffix}`.replace(/\s+/g, ' ');
  });
}
