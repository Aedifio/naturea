import { computed, inject, Injectable, signal } from '@angular/core';
import auditAgencesDef from '../../../core/data/audit-agences-def.json';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Agence, Audit, AuditTechniqueState, CorpsAvg, CorpsMetier, UrgentEcart } from '../audit-technique.models';
import { CORPS, createEmptyCorps } from '../constants/audit-technique.constants';
import { auditAvg, avgAudits } from '../utils/audit-score.util';

function emptyState(): AuditTechniqueState {
  return {
    agences: (auditAgencesDef as Array<Omit<Agence, 'audits'>>).map((a) => ({ ...a, audits: [] })),
  };
}

@Injectable({ providedIn: 'root' })
export class AuditTechniqueDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly _state = signal<AuditTechniqueState>(emptyState());

  readonly state = this._state.asReadonly();
  readonly agences = computed(() => this._state().agences);

  readonly agencesSortedByScore = computed(() =>
    [...this.agences()]
      .map((a) => ({ ...a, score: avgAudits(a.audits) }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
  );

  readonly allAudits = computed(() => this.agences().flatMap((a) => a.audits));

  readonly networkScore = computed(() => avgAudits(this.allAudits()));

  readonly auditedCount = computed(() => this.agences().filter((a) => avgAudits(a.audits) !== null).length);

  readonly openUrgentsCount = computed(
    () => this.getAllUrgents().filter((u) => u.rectifStatus !== 'corrige').length,
  );

  async load(): Promise<void> {
    const [agenciesRes, auditsRes, corpsRes] = await Promise.all([
      this.supabase.from('audit_technique_agencies').select('*').order('id'),
      this.supabase.from('audit_technique_audits').select('*'),
      this.supabase.from('audit_technique_corps').select('*'),
    ]);

    if (agenciesRes.error) {
      console.error('[AuditTechnique] load failed', agenciesRes.error);
      this._state.set(emptyState());
      return;
    }

    const corpsByAudit = new Map<string, CorpsMetier[]>();
    for (const c of corpsRes.data ?? []) {
      const list = corpsByAudit.get(c.audit_id) ?? [];
      list.push({
        id: c.corps_id,
        code: c.code,
        label: c.label,
        note: c.note != null ? Number(c.note) : null,
        ecart: c.ecart,
        commentaire: c.commentaire ?? '',
        photos: c.photos ?? [],
        rectifStatus: c.rectif_status,
        rectifNote: c.rectif_note ?? '',
      });
      corpsByAudit.set(c.audit_id, list);
    }

    const auditsByAgence = new Map<number, Audit[]>();
    for (const a of auditsRes.data ?? []) {
      const payload = (a.payload ?? {}) as Record<string, string>;
      const auditId = Number(a.id) || Date.parse(a.id);
      const audit: Audit = {
        id: auditId,
        date: a.audit_date,
        auditeur: payload['auditeur'] ?? '',
        chantiers: payload['chantiers'] ?? '',
        participants: payload['participants'] ?? '',
        commentaires: payload['commentaires'] ?? '',
        corps: corpsByAudit.get(a.id) ?? createEmptyCorps(),
      };
      const list = auditsByAgence.get(a.agence_id) ?? [];
      list.push(audit);
      auditsByAgence.set(a.agence_id, list);
    }

    const agences: Agence[] = (agenciesRes.data ?? []).map((ag) => ({
      id: ag.id,
      nom: ag.nom,
      ville: ag.ville ?? '',
      adresse: ag.adresse ?? '',
      audits: auditsByAgence.get(ag.id) ?? [],
    }));

    if (!agences.length) {
      this._state.set(emptyState());
      return;
    }
    this._state.set({ agences });
  }

  private persist(state: AuditTechniqueState): void {
    this._state.set(state);
    void this.persistToDb(state);
  }

  private async persistToDb(state: AuditTechniqueState): Promise<void> {
    for (const ag of state.agences) {
      await this.supabase.from('audit_technique_agencies').upsert({
        id: ag.id,
        nom: ag.nom,
        ville: ag.ville,
        adresse: ag.adresse,
      });

      for (const au of ag.audits) {
        const auditId = String(au.id);
        await this.supabase.from('audit_technique_audits').upsert({
          id: auditId,
          agence_id: ag.id,
          audit_date: au.date,
          payload: {
            auditeur: au.auditeur,
            chantiers: au.chantiers,
            participants: au.participants,
            commentaires: au.commentaires,
          },
        });

        const corpsRows = au.corps.map((c) => ({
          audit_id: auditId,
          corps_id: c.id,
          code: c.code,
          label: c.label,
          note: c.note,
          ecart: c.ecart,
          rectif_status: c.rectifStatus,
          rectif_note: c.rectifNote,
          commentaire: c.commentaire,
          photos: c.photos,
        }));
        if (corpsRows.length) {
          await this.supabase.from('audit_technique_corps').upsert(corpsRows, { onConflict: 'audit_id,corps_id' });
        }
      }
    }
  }

  getAgence(id: number): Agence | undefined {
    return this.agences().find((a) => a.id === id);
  }

  getAudit(agenceId: number, auditId: number): Audit | undefined {
    return this.getAgence(agenceId)?.audits.find((a) => a.id === auditId);
  }

  getAllUrgents(): UrgentEcart[] {
    const res: UrgentEcart[] = [];
    for (const ag of this.agences()) {
      for (const au of ag.audits) {
        for (const c of au.corps) {
          if (c.ecart === 'urgent') {
            res.push({
              agenceId: ag.id,
              agenceNom: ag.nom,
              agenceVille: ag.ville,
              auditId: au.id,
              auditDate: au.date,
              corpsId: c.id,
              corpsCode: c.code,
              corpsLabel: c.label,
              commentaire: c.commentaire,
              rectifStatus: c.rectifStatus,
              rectifNote: c.rectifNote,
              photos: c.photos,
            });
          }
        }
      }
    }
    return res.sort((a, b) => b.auditDate.localeCompare(a.auditDate));
  }

  getCorpsWeaknesses(): CorpsAvg[] {
    const all = this.allAudits();
    const result: CorpsAvg[] = [];
    for (const cm of CORPS) {
      const scores = all.flatMap((a) =>
        a.corps.filter((c) => c.id === cm.id && c.note !== null).map((c) => c.note as number),
      );
      if (scores.length) {
        result.push({
          id: cm.id,
          code: cm.code,
          label: cm.label,
          avg: scores.reduce((a, b) => a + b, 0) / scores.length,
        });
      }
    }
    return result.sort((a, b) => a.avg - b.avg);
  }

  getRecentAgencies(limit = 3): Array<Agence & { lastDate: string; score: number | null }> {
    return [...this.agences()]
      .filter((a) => a.audits.length > 0)
      .map((a) => ({
        ...a,
        lastDate: [...a.audits].map((x) => x.date).sort().reverse()[0],
        score: avgAudits(a.audits),
      }))
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate))
      .slice(0, limit);
  }

  updateRectif(agenceId: number, auditId: number, corpsId: number, field: 'rectifStatus' | 'rectifNote', val: string): void {
    const state = structuredClone(this._state());
    const ag = state.agences.find((x) => x.id === agenceId);
    const au = ag?.audits.find((x) => x.id === auditId);
    const c = au?.corps.find((x) => x.id === corpsId);
    if (!c) return;
    if (field === 'rectifStatus') {
      c.rectifStatus = val as typeof c.rectifStatus;
    } else {
      c.rectifNote = val;
    }
    this.persist(state);
  }

  addAudit(agenceId: number, audit: Audit): void {
    const state = structuredClone(this._state());
    const ag = state.agences.find((x) => x.id === agenceId);
    if (!ag) return;
    ag.audits.push(audit);
    this.persist(state);
  }

  deleteAudit(agenceId: number, auditId: number): void {
    const state = structuredClone(this._state());
    const ag = state.agences.find((x) => x.id === agenceId);
    if (!ag) return;
    ag.audits = ag.audits.filter((a) => a.id !== auditId);
    this.persist(state);
  }

  replaceState(state: AuditTechniqueState): void {
    this.persist(state);
  }

  createEmptyAudit(): Audit {
    return {
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      auditeur: '',
      chantiers: '',
      participants: '',
      commentaires: '',
      corps: createEmptyCorps(),
    };
  }

  auditScore(audit: Audit): number | null {
    return auditAvg(audit);
  }
}
