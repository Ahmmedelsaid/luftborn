import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Settings section; replaced on its own branch. */
@Component({
  selector: 'app-settings-page',
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header title="Settings" />
    <app-empty-state title="Settings" message="This section is not implemented yet." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {}
