export type KpiTone = 'green' | 'amber' | 'red' | 'muted' | '';

export interface KpiItem {
  label: string;
  value: string | number;
  tone?: KpiTone;
}

export function normAgency(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function findAgency<T>(list: T[] | null | undefined, name: string, getName: (x: T) => string): T | null {
  if (!list?.length || !name) return null;
  const t = normAgency(name);
  let hit = list.find((x) => normAgency(getName(x)) === t);
  if (hit) return hit;
  hit = list.find((x) => {
    const n = normAgency(getName(x));
    return n && (n.includes(t) || t.includes(n));
  });
  return hit ?? null;
}

export function permissionLabel(perm: string | null): string {
  if (perm === 'ADMIN') return 'Admin';
  if (perm === 'RW') return 'Écriture';
  if (perm === 'R') return 'Lecture';
  return 'Verrouillé';
}
