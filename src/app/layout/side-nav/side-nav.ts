import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NavItem } from '../interfaces/nav-item.interface';

/** Presentational navigation rail; the shell owns routing and layout. */
@Component({
  selector: 'app-side-nav',
  imports: [MatIconModule, RouterLink, RouterLinkActive],
  templateUrl: './side-nav.html',
  styleUrl: './side-nav.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-side-nav',
    role: 'navigation',
    '[attr.aria-label]': '"Main navigation"',
  },
})
export class SideNav {
  readonly items = input.required<readonly NavItem[]>();

  /** Lets the shell close the mobile drawer. */
  readonly navigated = output<void>();

  readonly createTask = output<void>();
}
