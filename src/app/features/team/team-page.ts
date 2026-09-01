import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Team section; replaced on its own branch. */
@Component({
  selector: 'app-team-page',
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header title="Team" />
    <app-empty-state title="Team" message="This section is not implemented yet." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamPage {}
