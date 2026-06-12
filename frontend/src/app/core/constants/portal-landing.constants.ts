import { APPS_META } from '../models/permissions.model';
import { AppCode } from '../models/user.model';

/** Priority order when landing users without PORTAIL access. */
export const PORTAL_APP_LANDING_ORDER: AppCode[] = [
  'RESEAU',
  'CODIR',
  'RECRUT',
  'OSSATURE',
  'AUDIT',
  'AUDIT_COM',
  'CHIFFRAGE',
  'ADMIN',
];

export function routeForAppCode(
  code: AppCode,
  agencyId: number | null,
  isRecrutementCandidate = false,
): string {
  if (code === 'RECRUT' && isRecrutementCandidate) {
    return '/apps/recrutement/espace';
  }
  if (code === 'AUDIT' && agencyId != null) {
    return `/apps/audit-technique/agence/${agencyId}`;
  }
  if (code === 'AUDIT_COM' && agencyId != null) {
    return `/apps/audit-commerce/agence/${agencyId}`;
  }
  return APPS_META.find((a) => a.code === code)?.route ?? '/home';
}
