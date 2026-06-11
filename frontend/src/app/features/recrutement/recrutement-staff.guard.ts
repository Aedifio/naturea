import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';

/** Blocks franchise candidates from staff-only recrutement routes. */
export const recrutementStaffGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isRecrutementCandidate()) {
    return router.createUrlTree(['/apps/recrutement/espace']);
  }
  return true;
};

/** Redirects franchise candidates from the staff dashboard to their portal home. */
export const recrutementHomeGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  await auth.whenReady();
  if (auth.isRecrutementCandidate()) {
    return router.createUrlTree(['/apps/recrutement/espace']);
  }
  return true;
};
