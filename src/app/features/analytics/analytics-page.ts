import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Analytics section; replaced on its own branch. */
@Component({
  selector: 'app-analytics-page',
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header title="Analytics" />
    <app-empty-state title="Analytics" message="This section is not implemented yet." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage {}
