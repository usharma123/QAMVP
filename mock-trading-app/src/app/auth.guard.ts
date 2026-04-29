import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { MockApiService } from './services/mock-api.service';

export const authGuard: CanActivateFn = () => {
  const api = inject(MockApiService);
  const router = inject(Router);

  if (api.getCurrentUser()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
