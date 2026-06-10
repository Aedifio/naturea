import type { Agency, Audit, LeafRow, MonthKpis, NoteStats, RatioValues } from '../audit-commerce.models';
import { LEAF_NODE } from '../constants/audit-commerce.constants';
import { MONTH_FR, MONTHS_FR_FULL } from '../constants/audit-commerce.constants';

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function todayYM(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS_FR_FULL[m - 1]} ${y}`;
}

export function ymShort(ym: string): string {
  const [y, m] = ym.split('-');
  return `${MONTH_FR[+m - 1]} ${y.slice(2)}`;
}

export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function monthsBack(ym: string, n: number): string[] {
  const [y, m] = ym.split('-').map(Number);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(y, m - 1 - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function leafTotal(au: Audit | null | undefined, id: string): number {
  const lf = au?.leaves?.[id];
  if (!lf?.rows) return 0;
  return lf.rows.reduce((s, r) => s + (Number(r.val) || 0), 0);
}

export function leafTotalEmp(au: Audit | null | undefined, id: string, empId: string | null): number {
  const lf = au?.leaves?.[id];
  if (!lf?.rows) return 0;
  return lf.rows.reduce((s, r) => (empId != null && r.empId !== empId ? s : s + (Number(r.val) || 0)), 0);
}

export function rdvTotal(au: Audit | null | undefined, empId: string | null): number {
  const lf = au?.leaves?.['cli.contact.rdv'];
  if (!lf?.rows) return 0;
  return lf.rows.reduce((s, r) => {
    if (empId != null && r.empId !== empId) return s;
    const v = r.vals ?? {};
    return s + (Number(v['r1']) || 0) + (Number(v['r2']) || 0) + (Number(v['r3']) || 0);
  }, 0);
}

export function rdvCol(au: Audit | null | undefined, empId: string | null, key: string): number {
  const lf = au?.leaves?.['cli.contact.rdv'];
  if (!lf?.rows) return 0;
  return lf.rows.reduce(
    (s, r) => (empId != null && r.empId !== empId ? s : s + (Number(r.vals?.[key]) || 0)),
    0,
  );
}

export function computeHS(au: Audit | null | undefined, empId: string | null): number {
  return (
    leafTotalEmp(au, 'cli.contact.entrant', empId) -
    (leafTotalEmp(au, 'cli.contact.traite', empId) + leafTotalEmp(au, 'cli.contact.relance', empId))
  );
}

export function ratiosFrom(c: Omit<RatioValues, 'r_traite' | 'r_rdv' | 'r_sign' | 'r_sign_r1' | 'r_resil' | 'r_hs'>): RatioValues {
  const pct = (n: number, d: number) => (d > 0 ? (n / d) * 100 : null);
  return {
    ...c,
    r_traite: pct(c.traite, c.entrant),
    r_rdv: pct(c.rdv, c.entrant),
    r_sign: pct(c.sign, c.entrant),
    r_sign_r1: pct(c.sign, c.r1),
    r_resil: pct(c.resil, c.sign),
    r_hs: pct(c.hs, c.entrant),
  };
}

export function computeRatios(au: Audit | null | undefined, empId: string | null): RatioValues {
  return ratiosFrom({
    entrant: leafTotalEmp(au, 'cli.contact.entrant', empId),
    traite: leafTotalEmp(au, 'cli.contact.traite', empId),
    rdv: rdvTotal(au, empId),
    r1: rdvCol(au, empId, 'r1'),
    sign: leafTotalEmp(au, 'cli.signatures', empId),
    resil: leafTotalEmp(au, 'cli.ccmi', empId),
    hs: computeHS(au, empId),
  });
}

export function monthAuditsAll(a: Agency, ym: string): Audit[] {
  return (a.audits ?? []).filter((au) => au.date?.slice(0, 7) === ym);
}

export function computeKpis(au: Audit | null | undefined): MonthKpis {
  const contacts = leafTotal(au, 'cli.contact.traite');
  const signatures = leafTotal(au, 'cli.signatures');
  const ccmi = leafTotal(au, 'cli.ccmi');
  const entrant = leafTotal(au, 'cli.contact.entrant');
  return { contacts, signatures, ccmi, entrant, transfo: contacts > 0 ? (signatures / contacts) * 100 : 0 };
}

export function monthKpis(a: Agency, ym: string): MonthKpis {
  let c = 0;
  let s = 0;
  let r = 0;
  let e = 0;
  monthAuditsAll(a, ym).forEach((au) => {
    const k = computeKpis(au);
    c += k.contacts;
    s += k.signatures;
    r += k.ccmi;
    e += k.entrant;
  });
  return { contacts: c, signatures: s, ccmi: r, entrant: e, transfo: c > 0 ? (s / c) * 100 : 0 };
}

export function monthNoteStats(a: Agency, ym: string): NoteStats {
  const per: Record<string, { sum: number; count: number }> = {};
  let gsum = 0;
  let gcount = 0;
  monthAuditsAll(a, ym).forEach((au) => {
    Object.keys(au.leaves ?? {}).forEach((id) => {
      const lf = au.leaves[id];
      if (lf?.rows) {
        lf.rows.forEach((row) => {
          const n = Number(row.note);
          if (row.empId && row.note !== '' && row.note != null && !isNaN(n)) {
            per[row.empId] = per[row.empId] ?? { sum: 0, count: 0 };
            per[row.empId].sum += n;
            per[row.empId].count++;
            gsum += n;
            gcount++;
          }
        });
      }
    });
  });
  const emp: NoteStats['emp'] = {};
  Object.keys(per).forEach((eid) => {
    emp[eid] = { avg: per[eid].sum / per[eid].count, count: per[eid].count };
  });
  return { emp, agency: gcount ? gsum / gcount : null, rated: Object.keys(per).length, points: gcount };
}

export function noteStats(au: Audit | null | undefined): NoteStats {
  const per: Record<string, { sum: number; count: number }> = {};
  let gsum = 0;
  let gcount = 0;
  if (au?.leaves) {
    Object.keys(au.leaves).forEach((id) => {
      const lf = au.leaves[id];
      if (lf?.rows) {
        lf.rows.forEach((r) => {
          const n = Number(r.note);
          if (r.empId && r.note !== '' && r.note != null && !isNaN(n)) {
            per[r.empId] = per[r.empId] ?? { sum: 0, count: 0 };
            per[r.empId].sum += n;
            per[r.empId].count++;
            gsum += n;
            gcount++;
          }
        });
      }
    });
  }
  const emp: NoteStats['emp'] = {};
  Object.keys(per).forEach((eid) => {
    emp[eid] = { avg: per[eid].sum / per[eid].count, count: per[eid].count };
  });
  return { emp, agency: gcount ? gsum / gcount : null, rated: Object.keys(per).length, points: gcount };
}

export function computeRatiosMonth(a: Agency, ym: string, empId: string | null): RatioValues {
  const c = { entrant: 0, traite: 0, rdv: 0, r1: 0, sign: 0, resil: 0, hs: 0 };
  monthAuditsAll(a, ym).forEach((au) => {
    c.entrant += leafTotalEmp(au, 'cli.contact.entrant', empId);
    c.traite += leafTotalEmp(au, 'cli.contact.traite', empId);
    c.rdv += rdvTotal(au, empId);
    c.r1 += rdvCol(au, empId, 'r1');
    c.sign += leafTotalEmp(au, 'cli.signatures', empId);
    c.resil += leafTotalEmp(au, 'cli.ccmi', empId);
    c.hs += computeHS(au, empId);
  });
  return ratiosFrom(c);
}

export function noteVar(note: number | null | undefined, thr: number): string {
  if (note == null) return 'var(--ink-mute)';
  if (note < thr) return 'var(--red)';
  if (note < thr + 1.5) return 'var(--amber)';
  return 'var(--green)';
}

export function noteLabel(note: number | null | undefined, thr: number): string {
  if (note == null) return '— pas de note';
  if (note < thr) return 'En difficulté';
  if (note < thr + 1.5) return 'À surveiller';
  return 'Bon';
}

export function noteBg(note: number | null | undefined, thr: number): string {
  if (note == null) return 'var(--line2)';
  const c = noteVar(note, thr);
  if (c === 'var(--green)') return '#E3F1E8';
  if (c === 'var(--amber)') return '#F8EFD7';
  return '#F8E1DD';
}

export function isLocked(au: Audit | null | undefined): boolean {
  return !!au && au.status !== 'draft';
}

export function defaultAuditId(a: Agency | undefined, ym: string): string | null {
  if (!a?.audits?.length) return null;
  const inM = monthAuditsAll(a, ym);
  if (inM.length) return [...inM].sort((x, y) => y.date.localeCompare(x.date))[0].id;
  return [...a.audits].sort((x, y) => y.date.localeCompare(x.date))[0].id;
}

export function newAuditDate(ym: string): string {
  if (todayYM() === ym) return todayISO();
  const [y, m] = ym.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const dd = Math.min(new Date().getDate(), dim);
  return `${ym}-${String(dd).padStart(2, '0')}`;
}

export function empPointNotes(au: Audit, empId: string): Array<{ label: string; note: number }> {
  const out: Array<{ label: string; note: number }> = [];
  if (au.leaves) {
    Object.keys(au.leaves).forEach((id) => {
      const lf = au.leaves[id];
      if (lf?.rows) {
        lf.rows.forEach((r) => {
          const n = Number(r.note);
          if (r.empId === empId && r.note !== '' && r.note != null && !isNaN(n)) {
            out.push({ label: LEAF_NODE[id]?.label ?? id, note: n });
          }
        });
      }
    });
  }
  return out;
}

export function multiColTotal(rows: LeafRow[], key: string): number {
  return rows.reduce((s, r) => s + (Number(r.vals?.[key]) || 0), 0);
}
