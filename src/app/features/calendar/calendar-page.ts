import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyState } from '../../shared/components/empty-state/empty-state';
import { PageHeader } from '../../shared/components/page-header/page-header';

/** Placeholder for the Calendar section; replaced on its own branch. */
@Component({
  selector: 'app-calendar-page',
  imports: [EmptyState, PageHeader],
  template: `
    <app-page-header title="Calendar" />
    <app-empty-state title="Calendar" message="This section is not implemented yet." />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {}
