import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Settings section; replaced on its own branch. */
@Component({
  selector: 'app-settings-page',
  imports: [EmptyState, PageHeader, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.settings' | translate" />
    <app-empty-state
      [title]="'nav.settings' | translate"
      [message]="'placeholder.message' | translate"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
