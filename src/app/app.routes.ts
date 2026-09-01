import { Routes } from '@angular/router';

/**
 * Every feature is lazy-loaded, so each section arrives as its own chunk on first
 * navigation. `title` is set per route so the document title and screen-reader
 * announcements follow navigation without any component doing it manually.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        title: 'Dashboard · Task Manager',
        loadComponent: () =>
          import('./features/dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'tasks',
        title: 'Tasks · Task Manager',
        loadChildren: () => import('./features/tasks/tasks.routes').then((m) => m.TASKS_ROUTES),
      },
      {
        path: 'calendar',
        title: 'Calendar · Task Manager',
        loadComponent: () =>
          import('./features/calendar/calendar-page').then((m) => m.CalendarPage),
      },
      {
        path: 'analytics',
        title: 'Analytics · Task Manager',
        loadComponent: () =>
          import('./features/analytics/analytics-page').then((m) => m.AnalyticsPage),
      },
      {
        path: 'team',
        title: 'Team · Task Manager',
        loadComponent: () => import('./features/team/team-page').then((m) => m.TeamPage),
      },
      {
        path: 'settings',
        title: 'Settings · Task Manager',
        loadComponent: () =>
          import('./features/settings/settings-page').then((m) => m.SettingsPage),
      },
      {
        path: '**',
        title: 'Page not found · Task Manager',
        loadComponent: () =>
          import('./features/not-found/not-found-page').then((m) => m.NotFoundPage),
      },
    ],
  },
];
