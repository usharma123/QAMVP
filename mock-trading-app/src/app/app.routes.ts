import { Routes } from '@angular/router';
import { authGuard } from './auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./components/login/login.component').then((m) => m.LoginComponent) },
  { path: 'dashboard', canActivate: [authGuard], loadComponent: () => import('./components/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'trade', canActivate: [authGuard], loadComponent: () => import('./components/trade/trade.component').then((m) => m.TradeComponent) },
  { path: 'trades', canActivate: [authGuard], loadComponent: () => import('./components/trade-list/trade-list.component').then((m) => m.TradeListComponent) },
  { path: 'queue', canActivate: [authGuard], loadComponent: () => import('./components/queue/queue.component').then((m) => m.QueueComponent) },
  { path: 'admin/users', canActivate: [authGuard], loadComponent: () => import('./components/user-list/user-list.component').then((m) => m.UserListComponent) },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];
