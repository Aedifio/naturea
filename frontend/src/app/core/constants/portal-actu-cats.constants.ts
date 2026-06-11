export const PORTAL_ACTU_CATS = [
  { value: 'reseau', label: 'Réseau' },
  { value: 'comm', label: 'Communication' },
  { value: 'rh', label: 'RH & Formation' },
  { value: 'ops', label: 'Opérations' },
] as const;

export type PortalActuCat = (typeof PORTAL_ACTU_CATS)[number]['value'];

export function portalActuCatLabel(cat: string): string {
  return PORTAL_ACTU_CATS.find((c) => c.value === cat)?.label ?? cat;
}
