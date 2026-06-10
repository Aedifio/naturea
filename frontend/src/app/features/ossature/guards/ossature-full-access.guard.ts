import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/** Blocks factory-scoped users from Coordinateur / Franchisé views. */
export const ossatureFullAccessGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isOssatureFactoryScoped()) return true;
  return router.createUrlTree(['/apps/ossature/usine']);
};
