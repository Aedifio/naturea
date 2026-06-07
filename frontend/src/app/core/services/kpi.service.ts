import { Injectable } from '@angular/core';
import { findAgency, KpiItem } from '../models/kpi.model';
import { StorageKey } from '../models/storage-keys';
import { StorageService } from '../storage/storage.service';

@Injectable({ providedIn: 'root' })
export class KpiService {
  constructor(private readonly storage: StorageService) {}

  calcCodirKPI(): KpiItem[] | null {
    const data = this.storage.get<{ actions?: Array<{ status: string; deadline?: string }> }>(StorageKey.CodirData);
    if (!data?.actions?.length) return null;
    const actions = data.actions;
    const week = actions.filter((a) => {
      const days = this.codirDaysUntil(a.deadline);
      return a.status !== 'done' && days !== null && days >= 0 && days <= 7;
    }).length;
    const overdue = actions.filter((a) => {
      const days = this.codirDaysUntil(a.deadline);
      return a.status !== 'done' && days !== null && days < 0;
    }).length;
    const done = actions.filter((a) => a.status === 'done').length;
    return [
      { label: 'Total actions', value: actions.length },
      { label: 'En retard', value: overdue, tone: overdue ? 'red' : '' },
      { label: 'Cette semaine', value: week, tone: week ? 'amber' : '' },
      { label: 'Terminées', value: done, tone: 'green' },
    ];
  }

  calcRecrutKPI(): KpiItem[] | null {
    const db = this.storage.get<Array<{ statut: string }>>(StorageKey.Recrutement);
    if (!Array.isArray(db) || !db.length) return null;
    return [
      { label: 'Total candidats', value: db.length },
      { label: 'Nouveaux', value: db.filter((c) => c.statut === 'Nouveau').length, tone: 'amber' },
      { label: 'RDV planifiés', value: db.filter((c) => c.statut === 'RDV planifié').length, tone: 'green' },
      { label: 'Qualifiés', value: db.filter((c) => c.statut === 'Qualifié').length, tone: 'green' },
    ];
  }

  calcOssatureKPI(): KpiItem[] | null {
    const orders = this.storage.get<Array<{ statut: string; surface?: string | number }>>(StorageKey.OssatureOrders);
    if (!Array.isArray(orders) || !orders.length) return null;
    const active = orders.filter((o) => o.statut !== 'Annulée');
    const livrees = active.filter((o) => o.statut === 'Expédition validée');
    const m2Total = active.reduce((a, o) => a + this.parseM2(o.surface), 0);
    const m2Liv = livrees.reduce((a, o) => a + this.parseM2(o.surface), 0);
    return [
      { label: 'Cdes actives', value: active.length },
      { label: 'Livrées', value: livrees.length, tone: 'green' },
      { label: 'M² total', value: Math.round(m2Total) },
      { label: 'M² livrés', value: Math.round(m2Liv), tone: 'green' },
    ];
  }

  calcAuditKPI(): KpiItem[] | null {
    const data = this.storage.get<{ agences?: Array<{ audits?: Array<{ corps?: Array<{ note?: number | null }> }> }> }>(
      StorageKey.AuditTechnique,
    );
    if (!data?.agences?.length) return null;
    const allAudits = data.agences.flatMap((a) => a.audits ?? []);
    if (!allAudits.length) return null;
    const score = this.auditAvg(allAudits);
    const audited = data.agences.filter((a) => this.auditAvg(a.audits) !== null);
    const nonAudited = data.agences.length - audited.length;
    return [
      {
        label: 'Score réseau',
        value: score !== null ? `${score.toFixed(2)}/5` : '—',
        tone: score === null ? 'muted' : score >= 4 ? 'green' : score >= 3 ? 'amber' : 'red',
      },
      { label: 'Agences auditées', value: `${audited.length}/${data.agences.length}` },
      { label: 'Audits total', value: allAudits.length },
      { label: 'Non auditées', value: nonAudited, tone: nonAudited ? 'amber' : 'green' },
    ];
  }

  calcAuditComKPI(): KpiItem[] | null {
    const data = this.storage.get<{
      agencies?: Array<{
        objectives?: { signatures?: number };
        audits?: Array<{ date?: string; leaves?: Record<string, { rows?: Array<{ val?: number; note?: number; empId?: string }> }> }>;
      }>;
      settings?: { noteThreshold?: number };
    }>(StorageKey.AuditCommerce);
    if (!data?.agencies?.length) return null;
    const th = Number(data.settings?.noteThreshold) || 5;
    const ym = new Date().toISOString().slice(0, 7);
    let totSign = 0;
    let totObj = 0;
    let audited = 0;
    let trouble = 0;
    let sumTransfo = 0;
    let anyAudit = false;

    for (const a of data.agencies) {
      const monthAudits = (a.audits ?? []).filter((au) => au.date?.slice(0, 7) === ym);
      let c = 0;
      let s = 0;
      for (const au of monthAudits) {
        c += this.leafTotal(au, 'cli.contact.traite');
        s += this.leafTotal(au, 'cli.signatures');
      }
      totSign += s;
      totObj += Number(a.objectives?.signatures) || 0;
      sumTransfo += c > 0 ? (s / c) * 100 : 0;
      if (monthAudits.length) {
        audited++;
        anyAudit = true;
      }
      const note = this.monthNote(a, ym);
      if (note != null && note < th) trouble++;
    }
    if (!anyAudit) return null;
    const pctObj = totObj > 0 ? Math.round((totSign / totObj) * 100) : null;
    const transfo = data.agencies.length ? sumTransfo / data.agencies.length : 0;
    return [
      {
        label: 'Signatures / objectif',
        value: pctObj == null ? '—' : `${pctObj}%`,
        tone: pctObj == null ? 'muted' : pctObj >= 100 ? 'green' : pctObj >= 80 ? 'amber' : 'red',
      },
      { label: 'Agences auditées', value: `${audited}/${data.agencies.length}` },
      { label: 'Agences en difficulté', value: trouble, tone: trouble ? 'red' : 'green' },
      { label: 'Taux de transfo.', value: `${transfo.toFixed(1)}%` },
    ];
  }

  calcChiffrageKPI(): KpiItem[] | null {
    const projets = this.storage.get<Array<{ date?: string; agence?: string }>>(StorageKey.ChiffrageProjets);
    const history = this.storage.get<Array<{ date_import?: string; postes?: Array<{ applique?: boolean; delta_pct?: number }> }>>(
      StorageKey.ChiffrageTarifsHistory,
    ) ?? [];
    const cutoff = Date.now() - 30 * 86400000;
    const deltas: number[] = [];
    for (const h of history) {
      if (h.date_import && new Date(h.date_import).getTime() >= cutoff) {
        for (const p of h.postes ?? []) {
          if (p.applique && typeof p.delta_pct === 'number') deltas.push(p.delta_pct);
        }
      }
    }
    const avgDelta = deltas.length ? deltas.reduce((s, x) => s + x, 0) / deltas.length : null;
    const projList = Array.isArray(projets) ? projets : [];
    if (!projList.length && !deltas.length) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last7 = new Date(today);
    last7.setDate(last7.getDate() - 7);
    const recents = projList.filter((p) => {
      if (!p.date) return false;
      const d = new Date(p.date);
      return !isNaN(d.getTime()) && d >= last7;
    });
    const agencesActives = new Set(projList.map((p) => p.agence).filter((a) => a && a !== '(siège)'));
    let varValue = '—';
    let varTone: KpiItem['tone'] = 'muted';
    if (avgDelta !== null) {
      varValue = `${avgDelta >= 0 ? '+' : ''}${avgDelta.toFixed(1)}%`;
      varTone = avgDelta > 5 ? 'red' : avgDelta > 0 ? 'amber' : 'green';
    }
    return [
      { label: 'Devis brouillons', value: projList.length },
      { label: 'Sur 7j', value: recents.length, tone: recents.length ? 'green' : 'muted' },
      {
        label: 'Agences actives',
        value: `${agencesActives.size}/17`,
        tone: agencesActives.size >= 10 ? 'green' : agencesActives.size >= 5 ? 'amber' : 'red',
      },
      { label: 'Var. tarifs (30j)', value: varValue, tone: varTone },
    ];
  }

  calcFranchiseAuditTech(name: string) {
    const d = this.storage.get<{ agences?: Array<{ nom: string; audits?: Array<{ date?: string; corps?: Array<{ note?: number; ecart?: string; rectifStatus?: string }> }> }> }>(
      StorageKey.AuditTechnique,
    );
    const ag = findAgency(d?.agences, name, (a) => a.nom);
    if (!ag) return { found: false as const };
    const audits = ag.audits ?? [];
    const perAudit = audits
      .map((a) => {
        const it = (a.corps ?? []).filter((c) => c.note != null);
        return it.length ? it.reduce((s, c) => s + (c.note ?? 0), 0) / it.length : null;
      })
      .filter((v): v is number => v !== null);
    const note = perAudit.length ? perAudit.reduce((a, b) => a + b, 0) / perAudit.length : null;
    let ecarts = 0;
    let dernier: string | null = null;
    for (const a of audits) {
      for (const c of a.corps ?? []) {
        if (c.ecart === 'urgent' && c.rectifStatus !== 'corrige') ecarts++;
      }
      if (a.date && (!dernier || a.date > dernier)) dernier = a.date;
    }
    return { found: true as const, note, ecarts, nbAudits: audits.length, dernier };
  }

  calcFranchiseAuditCom(name: string) {
    const d = this.storage.get<{
      settings?: { noteThreshold?: number };
      agencies?: Array<{
        name: string;
        objectives?: { signatures?: number };
        audits?: Array<{ date?: string; leaves?: Record<string, { rows?: Array<{ val?: number; note?: number | string; empId?: string }> }> }>;
      }>;
    }>(StorageKey.AuditCommerce);
    const ag = findAgency(d?.agencies, name, (a) => a.name);
    if (!ag) return { found: false as const };
    const th = Number(d?.settings?.noteThreshold) || 5;
    const ym = new Date().toISOString().slice(0, 7);
    const yyyy = String(new Date().getFullYear());
    const audits = ag.audits ?? [];
    const inMonth = audits.filter((au) => au.date?.slice(0, 7) === ym);
    const inYear = audits.filter((au) => au.date?.slice(0, 4) === yyyy);
    const sum = (arr: typeof audits, id: string) => arr.reduce((s, au) => s + this.leafTotal(au, id), 0);
    let nsum = 0;
    let nc = 0;
    for (const au of inYear) {
      for (const id of Object.keys(au.leaves ?? {})) {
        const lf = au.leaves![id];
        for (const r of lf.rows ?? []) {
          const v = Number(r.note);
          if (r.empId && r.note != null && r.note !== '' && !isNaN(v)) {
            nsum += v;
            nc++;
          }
        }
      }
    }
    return {
      found: true as const,
      note: nc ? nsum / nc : null,
      th,
      contactsAnnee: sum(inYear, 'cli.contact.entrant'),
      ventesMois: sum(inMonth, 'cli.signatures'),
      ventesAnnee: sum(inYear, 'cli.signatures'),
      objMois: Number(ag.objectives?.signatures) || 0,
    };
  }

  calcFranchiseOssature(name: string) {
    const orders = this.storage.get<Array<{ franchise?: string; statut?: string }>>(StorageKey.OssatureOrders) ?? [];
    const t = normAgency(name);
    const mine = orders.filter((o) => {
      const n = normAgency(o.franchise);
      return n && (n === t || n.includes(t) || t.includes(n));
    });
    const by = (s: string) => mine.filter((o) => o.statut === s).length;
    return {
      found: mine.length > 0,
      total: mine.length,
      devisDemande: by('Devis demandé'),
      devisEnvoye: by('Devis envoyé'),
      commande: by('Commande confirmée'),
      expedition: by('Expédition validée'),
    };
  }

  calcFranchiseChiffrage(name: string) {
    const projets = this.storage.get<Array<{ agence?: string; date?: string; total?: number }>>(StorageKey.ChiffrageProjets);
    if (!Array.isArray(projets)) return { found: false, total: 0, moisCount: 0, montant: 0 };
    const t = normAgency(name);
    const mine = projets.filter((p) => {
      const n = normAgency(p.agence);
      return n && (n === t || n.includes(t) || t.includes(n));
    });
    const ym = new Date().toISOString().slice(0, 7);
    const moisCount = mine.filter((p) => {
      if (!p.date) return false;
      const d = new Date(p.date);
      return !isNaN(d.getTime()) && d.toISOString().slice(0, 7) === ym;
    }).length;
    const montant = mine.reduce((s, p) => s + (Number(p.total) || 0), 0);
    return { found: mine.length > 0, total: mine.length, moisCount, montant };
  }

  private codirDaysUntil(iso?: string): number | null {
    if (!iso) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(iso);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86400000);
  }

  private parseM2(s: unknown): number {
    if (s == null) return 0;
    const n = parseFloat(String(s).replace(',', '.'));
    return isFinite(n) ? n : 0;
  }

  private auditAvg(audits?: Array<{ corps?: Array<{ note?: number | null }> }>): number | null {
    if (!audits?.length) return null;
    const sc2 = audits
      .map((a) => {
        const it = (a.corps ?? []).filter((c) => c.note != null);
        if (!it.length) return null;
        return it.reduce((s, c) => s + (c.note ?? 0), 0) / it.length;
      })
      .filter((s): s is number => s !== null);
    if (!sc2.length) return null;
    return sc2.reduce((a, b) => a + b, 0) / sc2.length;
  }

  private leafTotal(au: { leaves?: Record<string, { rows?: Array<{ val?: number }> }> }, id: string): number {
    const lf = au.leaves?.[id];
    if (!lf?.rows) return 0;
    return lf.rows.reduce((s, r) => s + (Number(r.val) || 0), 0);
  }

  private monthNote(
    a: { audits?: Array<{ date?: string; leaves?: Record<string, { rows?: Array<{ note?: number | string; empId?: string }> }> }> },
    ym: string,
  ): number | null {
    let sum = 0;
    let n = 0;
    for (const au of (a.audits ?? []).filter((x) => x.date?.slice(0, 7) === ym)) {
      for (const id of Object.keys(au.leaves ?? {})) {
        for (const row of au.leaves![id].rows ?? []) {
          const v = Number(row.note);
          if (row.empId && row.note != null && row.note !== '' && !isNaN(v)) {
            sum += v;
            n++;
          }
        }
      }
    }
    return n ? sum / n : null;
  }
}

function normAgency(s: string | null | undefined): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
