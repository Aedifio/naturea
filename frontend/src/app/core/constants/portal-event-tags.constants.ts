export const PORTAL_EVENT_TAGS = [
  { value: 'formation', label: 'Formation' },
  { value: 'reunion', label: 'Réunion' },
  { value: 'visite', label: 'Visite franchisé' },
  { value: 'event', label: 'Événement' },
] as const;

export type PortalEventTag = (typeof PORTAL_EVENT_TAGS)[number]['value'];

export function portalEventTagLabel(tag: string): string {
  return PORTAL_EVENT_TAGS.find((t) => t.value === tag)?.label ?? tag;
}
