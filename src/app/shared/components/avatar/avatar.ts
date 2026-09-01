import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Initials avatar. Presentational; the caller supplies the name and colour. */
@Component({
  selector: 'app-avatar',
  template: '{{ initials() }}',
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--app-avatar-color);
      color: #fff;
      font-weight: 600;
      letter-spacing: 0.02em;
      user-select: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--app-avatar-color]': 'resolvedColor()',
    '[style.width.px]': 'size()',
    '[style.height.px]': 'size()',
    '[style.font-size.px]': 'fontSize()',
    '[attr.title]': 'name()',
    'aria-hidden': 'true',
  },
})
export class Avatar {
  readonly name = input.required<string>();

  /** Pre-computed initials from the API; derived from `name` when absent. */
  readonly avatar = input<string>('');

  /** Defaults to brand blue, which is what the design uses everywhere. */
  readonly color = input<string>('');

  readonly size = input<number>(24);

  protected readonly initials = computed(() => this.avatar() || deriveInitials(this.name()));

  protected readonly resolvedColor = computed(() => this.color() || 'var(--app-primary)');

  protected readonly fontSize = computed(() => Math.round(this.size() * 0.4));
}

function deriveInitials(name: string): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';

  return `${first}${last}`.toUpperCase();
}
