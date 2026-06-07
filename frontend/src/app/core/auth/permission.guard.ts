import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AppCode } from '../models/user.model';
import { PortalPermissionsService } from '../services/portal-permissions.service';
import { AuthService } from './auth.service';

export function permissionGuard(appCode: AppCode): CanActivateFn {
  return async () => {
    const auth = inject(AuthService);
    const permissions = inject(PortalPermissionsService);
    const router = inject(Router);
    await auth.whenReady();
    await permissions.whenReady();
    if (auth.canReadApp(appCode)) return true;
    return router.createUrlTree(['/home']);
  };
}
