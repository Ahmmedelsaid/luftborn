import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';
import { AppLanguage } from '../../core/interfaces';
import { HttpCache } from '../../core/services/http-cache';
import { TaskStore } from '../../core/state/task-store';
import { PageHeader } from '../../shared/components/page-header/page-header';

/**
 * Settings.
 *
 * Also the place the HTTP cache becomes visible: hit, miss and de-duplication
 * counts are read straight off `HttpCache`. Being able to watch the cache work
 * while navigating is worth more than asserting it only in a spec.
 */
@Component({
  selector: 'app-settings-page',
  imports: [MatButtonModule, MatIconModule, PageHeader, TranslatePipe],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPage {
  private readonly cache = inject(HttpCache);
  private readonly tasks = inject(TaskStore);
  private readonly translate = inject(TranslateService);

  protected readonly language = inject(LanguageService);
  protected readonly stats = this.cache.stats;

  private readonly languageRevision = toSignal(this.translate.onLangChange, {
    initialValue: null,
  });

  /** Hit rate over resolved lookups, which is the number that actually means something. */
  protected readonly hitRate = computed(() => {
    const { hits, misses } = this.stats();
    const total = hits + misses;

    return total === 0 ? 0 : Math.round((hits / total) * 100);
  });

  protected readonly summary = computed(() => {
    this.languageRevision();

    return this.translate.instant('settings.summary') as string;
  });

  protected chooseLanguage(code: AppLanguage): void {
    this.language.use(code);
  }

  /** Clears the cache and refetches, so the effect is immediately observable. */
  protected clearCache(): void {
    this.cache.clear();
    this.cache.resetStats();
    this.tasks.reload();
  }
}
