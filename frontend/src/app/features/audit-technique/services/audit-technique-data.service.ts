import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { AgencyService } from '../../../core/services/agency.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type { Agence, Audit, AuditTechniqueState, CorpsAvg, CorpsMetier, UrgentEcart } from '../audit-technique.models';
import { CORPS, createEmptyCorps } from '../constants/audit-technique.constants';
import { auditAvg, avgAudits } from '../utils/audit-score.util';

@Injectable({ providedIn: 'root' })
export class AuditTechniqueDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly agencies = inject(AgencyService);
  /** Lazy — avoids AuthService ↔ AppDataBootstrapService circular DI. */
  private readonly injector = inject(Injector);

  /** Audits keyed by `agencies.id`. */
  private readonly _auditsByAgencyId = signal<Map<number, Audit[]>>(new Map());

  /** Agency list: metadata from `agencies`, audits from audit-technique tables. */
  readonly agences = computed(() => {
    this.agencies.agencies();
    const auditsMap = this._auditsByAgencyId();
    const result: Agence[] = [];

    for (const agency of this.agencies.getAll()) {
      result.push({
        id: agency.id,
        nom: agency.name,
        ville: agency.ville ?? '',
        adresse: agency.adresse ?? '',
        audits: auditsMap.get(agency.id) ?? [],
      });
    }

    const linkedAgencyId = this.linkedAgencyIdForScope();
    if (linkedAgencyId != null) {
      return result.filter((a) => a.id === linkedAgencyId);
    }

    return result;
  });

  /** Franchisé scope — resolved lazily to break DI cycle with AuthService. */
  private linkedAgencyIdForScope(): number | null {
    const auth = this.injector.get(AuthService);
    auth.currentUser();
    if (!auth.isAgencyScopedFranchisee()) return null;
    return auth.linkedAgencyId();
  }

  readonly agencesSortedByScore = computed(() =>
    [...this.agences()]
      .map((a) => ({ ...a, score: avgAudits(a.audits) }))
      .sort(
        (a, b) =>
          (b.score ?? -1) - (a.score ?? -1) || a.nom.localeCompare(b.nom, 'fr'),
      ),
  );

  readonly allAudits = computed(() => this.agences().flatMap((a) => a.audits));

  readonly networkScore = computed(() => avgAudits(this.allAudits()));

  readonly auditedCount = computed(() => this.agences().filter((a) => avgAudits(a.audits) !== null).length);

  readonly openUrgentsCount = computed(
    () => this.getAllUrgents().filter((u) => u.rectifStatus !== 'corrige').length,
  );

  async load(): Promise<void> {
    if (!this.agencies.ready()) {
      await this.agencies.load();
    }

    const canonical = this.agencies.getAll();
    if (!canonical.length) {
      this.clearCaches();
      return;
    }

    const [auditsRes, corpsRes] = await Promise.all([
      this.supabase.from('audit_technique_audits').select('*'),
      this.supabase.from('audit_technique_corps').select('*'),
    ]);

    if (auditsRes.error) {
      console.error('[AuditTechnique] load failed', auditsRes.error);
      this.clearCaches();
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

    const auditsByAgencyId = new Map<number, Audit[]>();
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
      const list = auditsByAgencyId.get(a.agency_id) ?? [];
      list.push(audit);
      auditsByAgencyId.set(a.agency_id, list);
    }

    this._auditsByAgencyId.set(auditsByAgencyId);
  }

  private clearCaches(): void {
    this._auditsByAgencyId.set(new Map());
  }

  private persistAgence(agencyId: number): void {
    const ag = this.getAgence(agencyId);
    if (ag) void this.persistAgenceToDb(ag);
  }

  private async persistAgenceToDb(ag: Agence): Promise<void> {
    for (const au of ag.audits) {
      const auditId = String(au.id);
      await this.supabase.from('audit_technique_audits').upsert({
        id: auditId,
        agency_id: ag.id,
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
    const audits = structuredClone(this._auditsByAgencyId().get(agenceId) ?? []);
    const au = audits.find((x) => x.id === auditId);
    const c = au?.corps.find((x) => x.id === corpsId);
    if (!c) return;
    if (field === 'rectifStatus') {
      c.rectifStatus = val as typeof c.rectifStatus;
    } else {
      c.rectifNote = val;
    }
    this._auditsByAgencyId.update((m) => new Map(m).set(agenceId, audits));
    this.persistAgence(agenceId);
  }

  addAudit(agenceId: number, audit: Audit): void {
    const audits = [...(this._auditsByAgencyId().get(agenceId) ?? []), audit];
    this._auditsByAgencyId.update((m) => new Map(m).set(agenceId, audits));
    this.persistAgence(agenceId);
  }

  deleteAudit(agenceId: number, auditId: number): void {
    const audits = (this._auditsByAgencyId().get(agenceId) ?? []).filter((a) => a.id !== auditId);
    this._auditsByAgencyId.update((m) => new Map(m).set(agenceId, audits));
    this.persistAgence(agenceId);
  }

  replaceState(state: AuditTechniqueState): void {
    const auditsMap = new Map<number, Audit[]>();
    for (const ag of state.agences) {
      auditsMap.set(ag.id, ag.audits);
    }
    this._auditsByAgencyId.set(auditsMap);
    for (const ag of state.agences) {
      void this.persistAgenceToDb(ag);
    }
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
