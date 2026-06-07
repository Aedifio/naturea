import { computed, inject, Injectable, signal } from '@angular/core';
import auditAgencesDef from '../../../core/data/audit-agences-def.json';
import { StorageKey } from '../../../core/models/storage-keys';
import { StorageService } from '../../../core/storage/storage.service';
import type { Agence, Audit, AuditTechniqueState, CorpsAvg, UrgentEcart } from '../audit-technique.models';
import { CORPS, createEmptyCorps } from '../constants/audit-technique.constants';
import { auditAvg, avgAudits } from '../utils/audit-score.util';

function emptyState(): AuditTechniqueState {
  return {
    agences: (auditAgencesDef as Array<Omit<Agence, 'audits'>>).map((a) => ({ ...a, audits: [] })),
  };
}

@Injectable({ providedIn: 'root' })
export class AuditTechniqueDataService {
  private readonly storage = inject(StorageService);
  private readonly _state = signal<AuditTechniqueState>(this.load());

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

  private load(): AuditTechniqueState {
    const raw = this.storage.get<AuditTechniqueState>(StorageKey.AuditTechnique);
    if (raw?.agences?.length) return raw;
    return emptyState();
  }

  private persist(state: AuditTechniqueState): void {
    this._state.set(state);
    this.storage.set(StorageKey.AuditTechnique, state);
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
