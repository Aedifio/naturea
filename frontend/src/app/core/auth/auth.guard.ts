import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isAuthenticated()) return true;
  return router.createUrlTree(['/login']);
};

/** Portal shell (home, réseau, admin) — not for Candidat franchise. */
export const portalAccessGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isRecrutementCandidate()) {
    return router.createUrlTree(['/apps/recrutement/espace']);
  }
  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (!auth.isAuthenticated()) return true;
  return router.createUrlTree([auth.defaultRouteAfterLogin()]);
};
