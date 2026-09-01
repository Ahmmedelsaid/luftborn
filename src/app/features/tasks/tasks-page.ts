import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Tasks section; replaced on its own branch. */
@Component({
  selector: 'app-tasks-page',
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header title="Tasks" />
    <app-empty-state title="Tasks" message="This section is not implemented yet." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TasksPage {}
