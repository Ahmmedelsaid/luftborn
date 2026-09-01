/**
 * Activity-feed model. Backed by a real API collection (`/api/activities`), so
 * the feed survives a reload: the server seeds it from recently touched tasks
 * and every mutation POSTs a new entry.
 */

export type ActivityType = 'created' | 'updated' | 'status_changed' | 'completed' | 'deleted';

export interface Activity {
  readonly id: string;
  readonly type: ActivityType;
  readonly taskId: string;
  /**
   * Title snapshot, denormalised so the feed still reads correctly after the
   * task is renamed or deleted.
   */
  readonly taskTitle: string;
  readonly userId: string;
  readonly userName: string;
  readonly userAvatar: string;
  /** Pre-composed fragment, e.g. `completed "Fix critical login bug"`. */
  readonly message: string;
  readonly timestamp: string;
}

/** Payload for `POST /api/activities`; the API assigns the `id`. */
export type ActivityDraft = Omit<Activity, 'id'>;

/** An activity plus the relative timestamp the feed renders. */
export interface ActivityView extends Activity {
  /** e.g. `"just now"`, `"12 minutes ago"`, `"yesterday"`. */
  readonly relativeTime: string;
}
