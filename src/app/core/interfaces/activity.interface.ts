import { LocalisedLabel } from './i18n.interface';

export type ActivityType = 'created' | 'updated' | 'status_changed' | 'completed' | 'deleted';

/** An entry in the recent-activity feed, from `GET /api/activities`. */
export interface Activity {
  readonly id: string;
  readonly type: ActivityType;
  readonly taskId: string;
  /** Denormalised so the feed still reads correctly after a rename or delete. */
  readonly taskTitle: string;
  readonly userId: string;
  readonly userName: string;
  readonly userAvatar: string;
  readonly message: string;
  readonly timestamp: string;
}

/** Payload for `POST /api/activities`. */
export type ActivityDraft = Omit<Activity, 'id'>;

export interface ActivityView extends Activity {
  /** Translation key plus params; the view layer renders it. */
  readonly relativeTime: LocalisedLabel;
}
