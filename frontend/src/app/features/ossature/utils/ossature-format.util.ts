export function surfaceM2(value?: number | null): number {
  if (value == null || Number.isNaN(value)) return 0;
  return value;
}

export function formatSurfaceM2(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} m²`;
}

export function formatDeliveryDate(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR');
}

export function orderYear(created?: string | null): number {
  if (!created) return new Date().getFullYear();
  const y = parseInt(created.slice(0, 4), 10);
  return Number.isFinite(y) ? y : new Date().getFullYear();
}
