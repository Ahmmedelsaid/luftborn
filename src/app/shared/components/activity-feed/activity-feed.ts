import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LocalisePipe } from '../../../core/i18n/localise.pipe';
import { Activity, ActivityType, ActivityView } from '../../../core/interfaces';
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
  imports: [Avatar, EmptyState, LocalisePipe, MatIconModule, Skeleton, TranslatePipe],
  templateUrl: './activity-feed.html',
  styleUrl: './activity-feed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-activity-feed' },
})
export class ActivityFeed {
  private readonly translate = inject(TranslateService);

  readonly activities = input.required<readonly ActivityView[]>();
  readonly loading = input<boolean>(false);

  protected readonly skeletonRows = [0, 1, 2, 3];

  protected iconFor(type: ActivityType): string {
    return TYPE_ICONS[type];
  }

  /**
   * Composes the sentence from `type` and `taskTitle` rather than rendering the
   * API's pre-composed `message`, which is English. The payload is the fallback,
   * so an activity type the bundle does not know still reads correctly.
   */
  protected messageFor(activity: Activity): string {
    this.languageRevision();

    const key = `activity.message.${activity.type}`;
    const translated = this.translate.instant(key, { title: activity.taskTitle }) as string;

    return translated === key ? activity.message : translated;
  }

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });
}
