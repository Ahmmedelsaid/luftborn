import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivityType, ActivityView } from '../../../core/interfaces';
import { Avatar } from '../avatar/avatar';
import { EmptyState } from '../empty-state/empty-state';
import { Skeleton } from '../skeleton/skeleton';

/** Icon and accent per activity type. */
const TYPE_ICONS: Readonly<Record<ActivityType, string>> = {
  created: 'plus',
  updated: 'edit',
  status_changed: 'chevron-right',
  completed: 'completed',
  deleted: 'delete',
};

@Component({
  selector: 'app-activity-feed',
  imports: [Avatar, EmptyState, MatIconModule, Skeleton],
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-activity-feed' },
})
export class ActivityFeed {
  readonly activities = input.required<readonly ActivityView[]>();
  readonly loading = input<boolean>(false);
  readonly title = input<string>('Recent Activity');

  protected readonly skeletonRows = [0, 1, 2, 3];

  protected iconFor(type: ActivityType): string {
    return TYPE_ICONS[type];
  }
}
