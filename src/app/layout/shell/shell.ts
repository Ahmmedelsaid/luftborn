import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { Router, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { TaskStore } from '../../core/state/task-store';
import { NavItem } from '../interfaces/nav-item.interface';
import { SideNav } from '../side-nav/side-nav';
import { TopBar } from '../top-bar/top-bar';

/** Kept in sync with the `desktop` breakpoint in `_tokens.scss`. */
const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * The only container in the layout tier: owns the permanent-rail versus
 * overlay-drawer decision and the global search binding.
 */
@Component({
  selector: 'app-shell',
  imports: [MatSidenavModule, RouterOutlet, SideNav, TopBar, TranslatePipe],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly tasks = inject(TaskStore);

  /** Matched to the Sass breakpoint so CSS and behaviour cannot disagree. */
  protected readonly isDesktop = toSignal(
    this.breakpoints.observe(DESKTOP_QUERY).pipe(map((state) => state.matches)),
    { initialValue: this.breakpoints.isMatched(DESKTOP_QUERY) },
  );

  /**
   * Overlay-drawer visibility. Only user intent writes to it — the drawer's own
   * close events are not wired back, since a close animation triggered by a
   * breakpoint change would otherwise cancel a fresh open.
   */
  protected readonly drawerOpen = signal(false);

  protected readonly search = computed(() => this.tasks.filters().search);

  /** Matches the Figma navigation exactly. */
  protected readonly navItems: readonly NavItem[] = [
    { labelKey: 'nav.dashboard', icon: 'dashboard', route: '/dashboard' },
    { labelKey: 'nav.tasks', icon: 'tasks', route: '/tasks' },
    { labelKey: 'nav.calendar', icon: 'calendar', route: '/calendar' },
    { labelKey: 'nav.analytics', icon: 'analytics', route: '/analytics' },
    { labelKey: 'nav.team', icon: 'team', route: '/team' },
    { labelKey: 'nav.settings', icon: 'settings', route: '/settings' },
  ];

  protected readonly notificationCount = computed(() => this.tasks.totals().overdue);

  protected onSearchChange(value: string): void {
    this.tasks.setSearch(value);
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  /** Routed, so the form is deep-linkable and browser back closes it. */
  protected async openTaskComposer(): Promise<void> {
    this.closeDrawer();
    await this.router.navigate(['/tasks/new']);
  }
}
