import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes } from '@angular/router';

/**
 * Task routes.
 *
 * `new` and `:id/edit` are children of the list, so the modal opens over the
 * board the user was already looking at rather than replacing it. Both are real
 * routes, which makes a task form deep-linkable and closable with browser back.
 */
export const TASKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./tasks-page').then((m) => m.TasksPage),
    // The datepicker throws without an adapter. Providing it here rather than at
    // the root keeps Material's date core out of the initial bundle, since the
    // task form is the only thing that needs it.
    providers: [provideNativeDateAdapter()],
    children: [
      {
        path: 'new',
        title: 'New task · Task Manager',
        loadComponent: () => import('./task-form/task-form-page').then((m) => m.TaskFormPage),
      },
      {
        path: ':id/edit',
        title: 'Edit task · Task Manager',
        loadComponent: () => import('./task-form/task-form-page').then((m) => m.TaskFormPage),
      },
    ],
  },
];
