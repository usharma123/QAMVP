import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent) },
  { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'trade', loadComponent: () => import('./components/trade/trade.component').then((m) => m.TradeComponent) },
  { path: 'trades', loadComponent: () => import('./components/trade-list/trade-list.component').then((m) => m.TradeListComponent) },
  { path: 'queue', loadComponent: () => import('./components/queue/queue.component').then((m) => m.QueueComponent) },
  { path: 'admin/users', loadComponent: () => import('./components/user-list/user-list.component').then((m) => m.UserListComponent) },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
