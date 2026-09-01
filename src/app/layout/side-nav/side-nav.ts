import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NavItem } from '../interfaces/nav-item.interface';

/**
 * Presentational navigation rail; the shell owns routing and layout.
 *
 * The landmark role and label live on the inner `<nav>` rather than the host, so
 * the label can be translated in the template instead of resolved imperatively.
 */
@Component({
  selector: 'app-side-nav',
  imports: [MatIconModule, RouterLink, RouterLinkActive, TranslatePipe],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'app-side-nav' },
})
export class SideNav {
  readonly items = input.required<readonly NavItem[]>();

  /** Lets the shell close the mobile drawer. */
  readonly navigated = output<void>();

  readonly createTask = output<void>();
}
