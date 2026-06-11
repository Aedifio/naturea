import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Redirects agency-scoped Franchisé users from network views to their agency page. */
export function auditTechniqueNetworkGuard(): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const agencyId = auth.linkedAgencyId();
    if (!auth.isAgencyScopedFranchisee() || agencyId == null) return true;
    return router.createUrlTree(['/apps/audit-technique/agence', agencyId]);
  };
}

/** Blocks access to another agency's audit technique pages. */
export function auditTechniqueAgencyGuard(): CanActivateFn {
  return (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const linked = auth.linkedAgencyId();
    if (!auth.isAgencyScopedFranchisee() || linked == null) return true;
    const requested = Number(route.paramMap.get('agenceId'));
    if (requested === linked) return true;
    return router.createUrlTree(['/apps/audit-technique/agence', linked]);
  };
}

/** Redirects agency-scoped Franchisé users from network view to their agency page. */
export function auditCommerceNetworkGuard(): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const agencyId = auth.linkedAgencyId();
    if (!auth.isAgencyScopedFranchisee() || agencyId == null) return true;
    return router.createUrlTree(['/apps/audit-commerce/agence', agencyId]);
  };
}

/** Blocks access to another agency's audit commerce pages. */
export function auditCommerceAgencyGuard(): CanActivateFn {
  return (route) => {
    const auth = inject(AuthService);
    const router = inject(Router);
    const linked = auth.linkedAgencyId();
    if (!auth.isAgencyScopedFranchisee() || linked == null) return true;
    const requested = Number(route.paramMap.get('agencyId'));
    if (requested === linked) return true;
    return router.createUrlTree(['/apps/audit-commerce/agence', linked]);
  };
}
