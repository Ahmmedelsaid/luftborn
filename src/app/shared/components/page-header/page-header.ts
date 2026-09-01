import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Actions are projected in, so each page keeps its own controls. */
@Component({
  selector: 'app-page-header',
  template: `
    <div class="header__text">
      <h1 class="header__title">{{ title() }}</h1>
      @if (subtitle()) {
        <p class="header__subtitle">{{ subtitle() }}</p>
      }
    </div>
    <div class="header__actions">
      <ng-content />
    </div>
  `,
  styles: `
    @use 'mixins';

    :host {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: var(--app-space-3);
      margin-bottom: var(--app-space-5);
    }

    .header__title {
      font-size: 20px;
      line-height: 1.3;
      letter-spacing: -0.01em;
    }

    .header__subtitle {
      margin-top: 2px;
      color: var(--app-text-secondary);
      font-size: 13px;
    }

    .header__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--app-space-2);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
