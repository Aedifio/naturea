import type { Audit, CorpsMetier } from '../audit-technique.models';

export function scoreColor(s: number | null | undefined): string {
  if (s === null || s === undefined) return '#8a948c';
  if (s >= 4) return '#2f8557';
  if (s >= 3) return '#c98f37';
  if (s >= 2) return '#c5703d';
  return '#b8453d';
}

export function scoreLabel(s: number | null | undefined): string {
  if (s === null || s === undefined) return '—';
  if (s >= 4) return 'Excellent';
  if (s >= 3) return 'Satisfaisant';
  if (s >= 2) return 'À améliorer';
  return 'Critique';
}

export function auditAvg(audit: Audit): number | null {
  const items = audit.corps.filter((c) => c.note !== null);
  if (!items.length) return null;
  return items.reduce((s, c) => s + (c.note ?? 0), 0) / items.length;
}

export function avgAudits(audits: Audit[] | undefined): number | null {
  if (!audits?.length) return null;
  const scores = audits.map(auditAvg).filter((s): s is number => s !== null);
  if (!scores.length) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const p = d.split('-');
  if (p.length !== 3) return d;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

export function corpsRelevant(c: CorpsMetier): boolean {
  return c.note !== null || !!c.commentaire || c.photos.length > 0;
}
