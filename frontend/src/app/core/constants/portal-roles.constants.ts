export const FACTORY_MANAGER_ROLE = "Responsable d'usine";
export const FRANCHISEE_ROLE = 'Franchisé';

/** Portal super-admin (DB role `Animateur`, UI « Administrateur »). */
export const ADMINISTRATOR_ROLE = 'Animateur';

export function normalizePortalRole(role: string | null | undefined): string {
  return (role ?? '').replace(/\u2019/g, "'").trim();
}

export function isFactoryManagerRole(role: string | null | undefined): boolean {
  return normalizePortalRole(role) === normalizePortalRole(FACTORY_MANAGER_ROLE);
}

export function isFranchiseeRole(role: string | null | undefined): boolean {
  return normalizePortalRole(role) === normalizePortalRole(FRANCHISEE_ROLE);
}

export function isAdministratorRole(role: string | null | undefined): boolean {
  return normalizePortalRole(role) === normalizePortalRole(ADMINISTRATOR_ROLE);
}
