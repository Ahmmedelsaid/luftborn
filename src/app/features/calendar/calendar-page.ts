import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { TaskView } from '../../core/interfaces';
import { ClockService } from '../../core/services/clock';
import { TaskStore } from '../../core/state/task-store';
import { parseApiDate, startOfDay, toApiDateString } from '../../core/utils/date.utils';
import { ErrorState } from '../../shared/components/error-state/error-state';
import { PageHeader } from '../../shared/components/page-header/page-header';
import { Skeleton } from '../../shared/components/skeleton/skeleton';
import { CalendarDay } from './interfaces';

/** Six rows of seven always covers a month, so the grid never changes height. */
const GRID_DAYS = 42;

/**
 * Month view of tasks by due date.
 *
 * The grid starts on the locale's first weekday, so Arabic begins on Saturday
 * and English on Monday — a calendar that starts on the wrong day is worse than
 * no calendar.
 */
@Component({
  selector: 'app-calendar-page',
  imports: [
    ErrorState,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PageHeader,
    Skeleton,
    TranslatePipe,
  ],
  templateUrl: './calendar-page.html',
  styleUrl: './calendar-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarPage {
  private readonly tasks = inject(TaskStore);
  private readonly clock = inject(ClockService);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  protected readonly loading = this.tasks.isLoading;
  protected readonly loadError = this.tasks.loadError;

  /** Months offset from today, so navigation needs no date arithmetic in the view. */
  private readonly monthOffset = signal(0);

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  private readonly viewMonth = computed(() => {
    const base = startOfDay(this.clock.now());
    return new Date(base.getFullYear(), base.getMonth() + this.monthOffset(), 1);
  });

  protected readonly monthLabel = computed(() => {
    this.languageRevision();

    return this.viewMonth().toLocaleDateString(this.language.locale(), {
      month: 'long',
      year: 'numeric',
    });
  });

  /** Weekday headers, in the locale's own order and script. */
  protected readonly weekdays = computed(() => {
    this.languageRevision();
    const locale = this.language.locale();
    const first = firstWeekday(locale);

    return Array.from({ length: 7 }, (_, index) => {
      // 1970-01-04 was a Sunday, which makes the offset arithmetic obvious.
      const day = new Date(Date.UTC(1970, 0, 4 + ((first + index) % 7)));
      return day.toLocaleDateString(locale, { weekday: 'short' });
    });
  });

  protected readonly days = computed<readonly CalendarDay[]>(() => {
    const month = this.viewMonth();
    const today = startOfDay(this.clock.now());
    const byDate = tasksByDueDate(this.tasks.tasks());

    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const lead = (first.getDay() - firstWeekday(this.language.locale()) + 7) % 7;
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - lead);

    return Array.from({ length: GRID_DAYS }, (_, index) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      const key = toApiDateString(date);
      const dayTasks = byDate.get(key) ?? [];

      return {
        date,
        key,
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === month.getMonth(),
        isToday: date.getTime() === today.getTime(),
        tasks: dayTasks,
        overdueCount: dayTasks.filter((task) => task.overdue).length,
      };
    });
  });

  protected readonly summary = computed(() => {
    this.languageRevision();
    const scheduled = this.days().reduce(
      (total, day) => total + (day.inMonth ? day.tasks.length : 0),
      0,
    );

    return this.translate.instant('calendar.summary', { count: scheduled }) as string;
  });

  protected readonly isCurrentMonth = computed(() => this.monthOffset() === 0);

  protected stepMonth(delta: number): void {
    this.monthOffset.update((offset) => offset + delta);
  }

  protected goToToday(): void {
    this.monthOffset.set(0);
  }

  protected onReload(): void {
    this.tasks.reload();
  }

  protected async onOpenTask(task: TaskView): Promise<void> {
    await this.router.navigate(['/tasks', task.id, 'edit']);
  }
}

/** Buckets tasks by their `YYYY-MM-DD` due date. */
function tasksByDueDate(tasks: readonly TaskView[]): Map<string, TaskView[]> {
  const map = new Map<string, TaskView[]>();

  for (const task of tasks) {
    const key = toApiDateString(parseApiDate(task.dueDate));
    const bucket = map.get(key);

    if (bucket) {
      bucket.push(task);
    } else {
      map.set(key, [task]);
    }
  }

  return map;
}

/**
 * First day of the week for a locale, as a `Date.getDay()` index.
 *
 * `Intl.Locale.prototype.getWeekInfo` is the correct source but is not in every
 * engine yet, so this falls back to Monday — the ISO default — rather than
 * silently assuming Sunday.
 */
function firstWeekday(locale: string): number {
  try {
    const info = (
      new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number } }
    ).getWeekInfo?.();

    // `weekInfo.firstDay` is 1..7 with Monday as 1; `getDay()` is 0..6 with
    // Sunday as 0.
    return info ? info.firstDay % 7 : 1;
  } catch {
    return 1;
  }
}
