import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Analytics section; replaced on its own branch. */
@Component({
  selector: 'app-analytics-page',
  imports: [EmptyState, PageHeader, TranslatePipe],
  template: `
    <app-page-header [title]="'nav.analytics' | translate" />
    <app-empty-state
      [title]="'nav.analytics' | translate"
      [message]="'placeholder.message' | translate"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {}
