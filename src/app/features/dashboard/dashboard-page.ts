import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Dashboard section; replaced on its own branch. */
@Component({
  selector: 'app-dashboard-page',
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header title="Dashboard" />
    <app-empty-state title="Dashboard" message="This section is not implemented yet." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {}
