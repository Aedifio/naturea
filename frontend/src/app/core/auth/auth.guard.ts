import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  await auth.ensureAccountActive();
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/** Portal shell (home, réseau, admin) — requires PORTAIL permission. */
export const portalAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.canAccessPortail()) return true;
  return router.createUrlTree([auth.firstAccessibleAppRoute()]);
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree([auth.defaultRouteAfterLogin()]);
};
