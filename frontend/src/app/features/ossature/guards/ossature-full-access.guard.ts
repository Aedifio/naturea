import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/** Blocks scoped users from views outside their allowed Ossature nav. */
export const ossatureRestrictedViewGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const path = route.routeConfig?.path ?? '';

  if (auth.isOssatureFactoryScoped()) {
    return router.createUrlTree(['/apps/ossature/usine']);
  }

  if (auth.isOssatureAgencyScoped() && path === '') {
    return router.createUrlTree(['/apps/ossature/franchise']);
  }

  return true;
};

/** Blocks agency-scoped users from the usine view. */
export const ossatureUsineGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isOssatureAgencyScoped()) {
    return router.createUrlTree(['/apps/ossature/franchise']);
  }
  return true;
};
