export const PORTAL_NEWSLETTER_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'text', label: 'Texte' },
] as const;

export type PortalNewsletterType = (typeof PORTAL_NEWSLETTER_TYPES)[number]['value'];

export function portalNewsletterTypeLabel(type: string): string {
  return PORTAL_NEWSLETTER_TYPES.find((t) => t.value === type)?.label ?? type;
}
