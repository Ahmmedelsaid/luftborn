import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageSwitcher } from '../../shared/components/language-switcher/language-switcher';

/**
 * Presentational top bar. Search text is passed in and changes are emitted out,
 * so the value stays correct when it is changed from elsewhere.
 */
@Component({
  selector: 'app-top-bar',
  imports: [LanguageSwitcher, MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-top-bar' },
})
export class TopBar {
  readonly search = input<string>('');

  readonly userInitials = input<string>('AE');

  readonly userName = input<string>('Ahmed Elsaid');

  /** The dot is hidden at zero. */
  readonly notificationCount = input<number>(0);

  /** Below the desktop breakpoint. */
  readonly showMenuButton = input<boolean>(false);

  readonly searchChange = output<string>();
  readonly menuToggle = output<void>();

  protected readonly searchFocused = signal(false);

  protected onSearchInput(event: Event): void {
    this.searchChange.emit((event.target as HTMLInputElement).value);
  }

  protected clearSearch(): void {
    this.searchChange.emit('');
  }
}
