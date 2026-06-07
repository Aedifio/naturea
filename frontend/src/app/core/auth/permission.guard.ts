import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppCode } from '../models/user.model';
import { AuthService } from './auth.service';

export function permissionGuard(appCode: AppCode): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (auth.canReadApp(appCode)) return true;
    return router.createUrlTree(['/home']);
  };
}
