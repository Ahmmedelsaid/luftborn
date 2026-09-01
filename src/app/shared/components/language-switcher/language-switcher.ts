import { UpperCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '../../../core/i18n/language.service';
import { AppLanguage } from '../../../core/interfaces';

/** Language menu. Each option is shown in its own script, never translated. */
@Component({
  selector: 'app-language-switcher',
  imports: [MatIconModule, MatMenuModule, TranslatePipe, UpperCasePipe],
  template: `
    <button
      type="button"
      class="switcher__trigger"
      [attr.aria-label]="'app.chooseLanguage' | translate"
      [matMenuTriggerFor]="menu"
    >
      <span class="switcher__code">{{ language.current() | uppercase }}</span>
      <mat-icon svgIcon="chevron-down" aria-hidden="true" />
    </button>

    <mat-menu #menu="matMenu" class="app-menu">
      @for (option of language.languages; track option.code) {
        <button
          mat-menu-item
          type="button"
          [attr.lang]="option.code"
          [attr.aria-current]="option.code === language.current() ? 'true' : null"
          (click)="choose(option.code)"
        >
          <span class="switcher__row">
            <span class="row__label">{{ option.nativeLabel }}</span>
            <mat-icon
              class="row__check"
              [class.row__check--on]="option.code === language.current()"
              svgIcon="check"
              aria-hidden="true"
            />
          </span>
        </button>
      }
    </mat-menu>
  `,
  styles: `
    @use 'mixins';

    .switcher__trigger {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      height: 34px;
      padding-inline: 8px;
      border: 1px solid var(--app-border);
      border-radius: var(--app-radius-md);
      background: var(--app-surface);
      color: var(--app-text-secondary);
      cursor: pointer;

      &:hover {
        border-color: var(--app-border-strong);
        color: var(--app-text);
      }

      mat-icon {
        width: 14px;
        height: 14px;
        font-size: 14px;
      }
    }

    .switcher__code {
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.03em;
    }

    .switcher__row {
      @include mixins.selectable-row;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LanguageSwitcher {
  protected readonly language = inject(LanguageService);

  protected choose(code: AppLanguage): void {
    this.language.use(code);
  }
}
