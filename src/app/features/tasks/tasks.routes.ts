import { Routes } from '@angular/router';

/** The composer and editor are routes, so a task form is deep-linkable. */
export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./tasks-page').then((m) => m.TasksPage),
  },
];
