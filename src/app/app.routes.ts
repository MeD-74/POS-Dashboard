import { Routes } from '@angular/router';

/**
 * Route-level code splitting: each feature is a lazily-loaded standalone
 * component, so the initial bundle only carries the shell. Adding a feature
 * never grows the first paint.
 */
export const routes: Routes = [
  { path: '', redirectTo: 'orders', pathMatch: 'full' },
  {
    path: 'orders',
    loadComponent: () =>
      import('./features/orders/pages/orders-workspace').then((m) => m.OrdersWorkspace),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/pages/search-page').then((m) => m.SearchPage),
  },
  { path: '**', redirectTo: 'orders' },
];
