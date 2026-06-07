import { computed, inject, Injectable, signal } from '@angular/core';
import { StorageKey } from '../../../core/models/storage-keys';
import { StorageService } from '../../../core/storage/storage.service';
import type {
  Agency,
  Audit,
  AuditCommerceState,
  BackupBundle,
  DocMeta,
  LeafData,
  StoredDoc,
} from '../audit-commerce.models';
import { AUDIT_COMMERCE_SEED } from '../constants/audit-commerce-seed.constants';
import { DOC_KEY_PREFIX, LEAF_KIND } from '../constants/audit-commerce.constants';
import { defaultAuditId, newAuditDate, todayISO, uid } from '../utils/audit-commerce.utils';

function emptyState(): AuditCommerceState {
  return { version: 2, agencies: [], settings: { threshold: 0.8, noteThreshold: 5 } };
}

function convOldLeaf(id: string, v: { val?: string | number; note?: string; emp?: string } | undefined): LeafData {
  if (LEAF_KIND[id] === 'text') return { text: String(v?.val ?? ''), note: v?.note ?? '' };
  const has = (v?.val !== '' && v?.val != null) || v?.emp;
  return {
    rows: has
      ? [{ id: uid(), empId: v?.emp ?? '', val: Number(v?.val) || 0, comment: '' }]
      : [],
    note: v?.note ?? '',
  };
}

function normLeaf(id: string, lf: LeafData | undefined): LeafData {
  const kind = LEAF_KIND[id];
  if (kind === 'text') {
    if (lf && typeof lf.text === 'string') return lf;
    return { text: String((lf as { val?: string })?.val ?? ''), note: lf?.note ?? '' };
  }
  if (lf?.rows) {
    lf.rows.forEach((r) => {
      if (!r.id) r.id = uid();
      if (kind === 'multi' && (!r.vals || typeof r.vals !== 'object')) r.vals = {};
    });
    return lf;
  }
  return convOldLeaf(id, lf as { val?: string | number; note?: string; emp?: string });
}

function migrate(data: Partial<AuditCommerceState> | null): AuditCommerceState {
  const base = data ?? {};
  const agencies = (base.agencies ?? []).map((a) => {
    const ag = { ...a };
    ag.employees = ag.employees ?? [];
    ag.objectives = ag.objectives ?? {};
    ag.documents = ag.documents ?? [];
    if (!ag.audits) {
      ag.audits = [];
      const months = (a as Agency & { months?: Record<string, { audit?: Record<string, unknown>; visitDate?: string; empRatings?: Audit['empRatings']; note?: string | number }> }).months ?? {};
      Object.keys(months)
        .sort()
        .forEach((ym) => {
          const m = months[ym];
          const leaves: Record<string, LeafData> = {};
          Object.keys(m.audit ?? {}).forEach((id) => {
            leaves[id] = convOldLeaf(id, m.audit![id] as { val?: string | number; note?: string; emp?: string });
          });
          ag.audits!.push({
            id: uid(),
            date: m.visitDate ?? `${ym}-15`,
            status: 'validated',
            leaves,
            empRatings: m.empRatings ?? {},
            note: m.note ?? '',
          });
        });
    }
    ag.audits = (ag.audits ?? []).map((au) => {
      const audit = { ...au, leaves: { ...au.leaves }, empRatings: { ...au.empRatings } };
      if ((audit.status as string) === 'published') audit.status = 'validated';
      if (!audit.status) audit.status = 'draft';
      Object.keys(audit.leaves).forEach((id) => {
        audit.leaves[id] = normLeaf(id, audit.leaves[id]);
      });
      return audit;
    });
    return ag;
  });
  return {
    version: 2,
    agencies,
    settings: { threshold: 0.8, noteThreshold: 5, ...base.settings },
  };
}

@Injectable({ providedIn: 'root' })
export class AuditCommerceDataService {
  private readonly storage = inject(StorageService);
  private readonly _state = signal<AuditCommerceState>(this.load());

  readonly state = this._state.asReadonly();
  readonly agencies = computed(() => this._state().agencies);
  readonly settings = computed(() => this._state().settings);

  private load(): AuditCommerceState {
    const raw = this.storage.get<AuditCommerceState>(StorageKey.AuditCommerce);
    if (raw?.agencies?.length) return migrate(raw);
    return emptyState();
  }

  private persist(state: AuditCommerceState): void {
    this._state.set(state);
    this.storage.set(StorageKey.AuditCommerce, state);
  }

  getAgency(id: string): Agency | undefined {
    return this.agencies().find((a) => a.id === id);
  }

  getAudit(agencyId: string, auditId: string): Audit | undefined {
    return this.getAgency(agencyId)?.audits.find((a) => a.id === auditId);
  }

  updateSettings(patch: Partial<AuditCommerceState['settings']>): void {
    const state = structuredClone(this._state());
    state.settings = { ...state.settings, ...patch };
    this.persist(state);
  }

  addAgencies(names: string[]): Agency[] {
    const state = structuredClone(this._state());
    const created = names.map((n) => ({
      id: uid(),
      name: n.trim(),
      address: '',
      employees: [],
      objectives: {},
      audits: [],
      documents: [],
    }));
    state.agencies.push(...created);
    this.persist(state);
    return created;
  }

  addAgency(name = 'Nouvelle agence'): Agency {
    return this.addAgencies([name])[0];
  }

  updateAgency(agencyId: string, patch: Partial<Pick<Agency, 'name' | 'address' | 'objectives'>>): void {
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) return;
    Object.assign(ag, patch);
    if (patch.objectives) ag.objectives = { ...ag.objectives, ...patch.objectives };
    this.persist(state);
  }

  addEmployee(agencyId: string): void {
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) return;
    ag.employees.push({ id: uid(), name: '', role: '' });
    this.persist(state);
  }

  updateEmployee(agencyId: string, empId: string, field: 'name' | 'role', value: string): void {
    const state = structuredClone(this._state());
    const emp = state.agencies.find((a) => a.id === agencyId)?.employees.find((e) => e.id === empId);
    if (!emp) return;
    emp[field] = value;
    this.persist(state);
  }

  deleteEmployee(agencyId: string, empId: string): void {
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) return;
    ag.employees = ag.employees.filter((e) => e.id !== empId);
    this.persist(state);
  }

  newAudit(agencyId: string, ym: string): Audit {
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) throw new Error('Agency not found');
    const au: Audit = {
      id: uid(),
      date: newAuditDate(ym),
      status: 'draft',
      leaves: {},
      empRatings: {},
      note: '',
    };
    ag.audits.push(au);
    this.persist(state);
    return au;
  }

  updateAudit(agencyId: string, auditId: string, patch: Partial<Audit>): void {
    const state = structuredClone(this._state());
    const au = state.agencies.find((a) => a.id === agencyId)?.audits.find((a) => a.id === auditId);
    if (!au) return;
    Object.assign(au, patch);
    if (patch.leaves) au.leaves = patch.leaves;
    if (patch.empRatings) au.empRatings = patch.empRatings;
    this.persist(state);
  }

  setAuditStatus(agencyId: string, auditId: string, status: Audit['status']): void {
    this.updateAudit(agencyId, auditId, { status });
  }

  deleteAudit(agencyId: string, auditId: string): void {
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) return;
    ag.audits = ag.audits.filter((a) => a.id !== auditId);
    this.persist(state);
  }

  ensureLeaf(agencyId: string, auditId: string, leafId: string): LeafData {
    const state = structuredClone(this._state());
    const au = state.agencies.find((a) => a.id === agencyId)?.audits.find((a) => a.id === auditId);
    if (!au) throw new Error('Audit not found');
    au.leaves = au.leaves ?? {};
    if (!au.leaves[leafId]) {
      au.leaves[leafId] = LEAF_KIND[leafId] === 'text' ? { text: '', note: '' } : { rows: [], note: '' };
    }
    this.persist(state);
    return au.leaves[leafId];
  }

  mutateAudit(agencyId: string, auditId: string, fn: (au: Audit, ag: Agency) => void): void {
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    const au = ag?.audits.find((a) => a.id === auditId);
    if (!ag || !au) return;
    fn(au, ag);
    this.persist(state);
  }

  resolveDefaultAuditId(agencyId: string, ym: string): string | null {
    return defaultAuditId(this.getAgency(agencyId), ym);
  }

  /* ---- Documents (raw localStorage keys fnet:doc:*) ---- */
  private docKey(id: string): string {
    return `${DOC_KEY_PREFIX}${id}`;
  }

  setDoc(id: string, payload: StoredDoc): void {
    try {
      localStorage.setItem(this.docKey(id), JSON.stringify(payload));
    } catch (e) {
      console.warn('[AuditCommerce] doc write failed', e);
      throw e;
    }
  }

  getDoc(id: string): StoredDoc | null {
    try {
      const raw = localStorage.getItem(this.docKey(id));
      return raw ? (JSON.parse(raw) as StoredDoc) : null;
    } catch {
      return null;
    }
  }

  deleteDoc(id: string): void {
    try {
      localStorage.removeItem(this.docKey(id));
    } catch {
      /* ignore */
    }
  }

  listDocKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(DOC_KEY_PREFIX)) keys.push(k);
    }
    return keys;
  }

  addDocument(agencyId: string, meta: DocMeta, payload: StoredDoc): void {
    this.setDoc(meta.id, payload);
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) return;
    ag.documents = ag.documents ?? [];
    ag.documents.unshift(meta);
    this.persist(state);
  }

  removeDocument(agencyId: string, docId: string): void {
    this.deleteDoc(docId);
    const state = structuredClone(this._state());
    const ag = state.agencies.find((a) => a.id === agencyId);
    if (!ag) return;
    ag.documents = (ag.documents ?? []).filter((d) => d.id !== docId);
    this.persist(state);
  }

  async exportBackup(): Promise<void> {
    const bundle: BackupBundle = {
      app: 'reseau-audit',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: this._state(),
      docs: {},
    };
    for (const k of this.listDocKeys()) {
      try {
        const v = localStorage.getItem(k);
        if (v) bundle.docs[k] = v;
      } catch {
        /* skip */
      }
    }
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sauvegarde-reseau-audit-${todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  importBackup(file: File): Promise<number> {
    return file.text().then((txt) => {
      const bundle = JSON.parse(txt) as BackupBundle | AuditCommerceState;
      const data = 'data' in bundle && bundle.data ? bundle.data : (bundle as AuditCommerceState);
      if (!data?.agencies || !Array.isArray(data.agencies)) throw new Error('fichier de sauvegarde non reconnu');
      if ('docs' in bundle && bundle.docs) {
        for (const k of Object.keys(bundle.docs)) {
          try {
            localStorage.setItem(k, bundle.docs[k]);
          } catch {
            /* skip */
          }
        }
      }
      const migrated = migrate(JSON.parse(JSON.stringify(data)));
      this.persist(migrated);
      return migrated.agencies.length;
    });
  }

  replaceState(state: AuditCommerceState): void {
    this.persist(migrate(state));
  }
}
