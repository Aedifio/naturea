import { computed, inject, Injectable, signal } from '@angular/core';
import { FileStorageService } from '../../../core/storage/file-storage.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
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
  private readonly supabase = inject(SupabaseService);
  private readonly files = inject(FileStorageService);
  private readonly docCache = new Map<string, StoredDoc>();
  private docsHydrated = false;
  private readonly _state = signal<AuditCommerceState>(emptyState());

  readonly state = this._state.asReadonly();
  readonly agencies = computed(() => this._state().agencies);
  readonly settings = computed(() => this._state().settings);

  async load(): Promise<void> {
    const [settingsRes, agenciesRes, auditsRes] = await Promise.all([
      this.supabase.from('audit_commerce_settings').select('*').eq('id', 1).maybeSingle(),
      this.supabase.from('audit_commerce_agencies').select('*').order('name'),
      this.supabase.from('audit_commerce_audits').select('*').order('audit_date'),
    ]);

    if (agenciesRes.error) {
      console.error('[AuditCommerce] load failed', agenciesRes.error);
      this._state.set(emptyState());
      return;
    }

    const auditsByAgency = new Map<string, Audit[]>();
    for (const a of auditsRes.data ?? []) {
      const audit: Audit = {
        id: a.id,
        date: a.audit_date,
        status: a.status as Audit['status'],
        leaves: a.leaves ?? {},
        empRatings: a.emp_ratings ?? {},
        note: a.note ?? '',
      };
      Object.keys(audit.leaves).forEach((id) => {
        audit.leaves[id] = normLeaf(id, audit.leaves[id]);
      });
      const list = auditsByAgency.get(a.agency_id) ?? [];
      list.push(audit);
      auditsByAgency.set(a.agency_id, list);
    }

    const agencies: Agency[] = (agenciesRes.data ?? []).map((ag) => ({
      id: ag.id,
      name: ag.name,
      address: '',
      employees: ag.employees ?? [],
      objectives: ag.objectives ?? {},
      documents: ag.documents ?? [],
      audits: auditsByAgency.get(ag.id) ?? [],
    }));

    const settingsRow = settingsRes.data;
    const state = migrate({
      version: 2,
      agencies,
      settings: settingsRow
        ? { threshold: Number(settingsRow.threshold), noteThreshold: Number(settingsRow.note_threshold) }
        : { threshold: 0.8, noteThreshold: 5 },
    });
    this._state.set(state);
  }

  private persist(state: AuditCommerceState): void {
    this._state.set(state);
    void this.persistToDb(state);
  }

  private async persistToDb(state: AuditCommerceState): Promise<void> {
    await this.supabase.from('audit_commerce_settings').upsert({
      id: 1,
      version: state.version,
      threshold: state.settings.threshold,
      note_threshold: state.settings.noteThreshold,
    });

    for (const ag of state.agencies) {
      await this.supabase.from('audit_commerce_agencies').upsert({
        id: ag.id,
        name: ag.name,
        objectives: ag.objectives ?? {},
        employees: ag.employees ?? [],
        documents: ag.documents ?? [],
      });

      for (const au of ag.audits) {
        await this.supabase.from('audit_commerce_audits').upsert({
          id: au.id,
          agency_id: ag.id,
          audit_date: au.date,
          status: au.status,
          leaves: au.leaves,
          emp_ratings: au.empRatings,
          note: au.note != null ? String(au.note) : null,
        });
      }
    }
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

  /* ---- Documents (Supabase app_kv_store + Storage) ---- */
  private docKey(id: string): string {
    return `${DOC_KEY_PREFIX}${id}`;
  }

  async ensureDocsHydrated(): Promise<void> {
    if (this.docsHydrated) return;
    const { data, error } = await this.supabase
      .from('app_kv_store')
      .select('storage_key, data')
      .like('storage_key', `${DOC_KEY_PREFIX}%`);
    if (error) {
      console.warn('[AuditCommerce] doc hydrate failed', error);
      return;
    }
    for (const row of data ?? []) {
      const id = row.storage_key.replace(DOC_KEY_PREFIX, '');
      this.docCache.set(id, row.data as StoredDoc);
    }
    this.docsHydrated = true;
  }

  setDoc(id: string, payload: StoredDoc): void {
    this.docCache.set(id, payload);
    void this.supabase
      .from('app_kv_store')
      .upsert({ storage_key: this.docKey(id), data: payload as object }, { onConflict: 'storage_key' })
      .then(({ error }) => {
        if (error) console.warn('[AuditCommerce] doc write failed', error);
      });
  }

  getDoc(id: string): StoredDoc | null {
    return this.docCache.get(id) ?? null;
  }

  async resolveDocImageUrl(doc: StoredDoc): Promise<string | null> {
    if (doc.type !== 'image') return null;
    if (doc.dataURL) return doc.dataURL;
    if (doc.storagePath && doc.storageBucket) {
      return this.files.getSignedUrl(doc.storageBucket as 'audit-commerce', doc.storagePath);
    }
    return null;
  }

  deleteDoc(id: string): void {
    const existing = this.docCache.get(id);
    if (existing?.type === 'image' && existing.storagePath && existing.storageBucket) {
      void this.files.delete(existing.storageBucket as 'audit-commerce', existing.storagePath);
    }
    this.docCache.delete(id);
    void this.supabase.from('app_kv_store').delete().eq('storage_key', this.docKey(id));
  }

  listDocKeys(): string[] {
    return [...this.docCache.keys()].map((id) => this.docKey(id));
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
    await this.ensureDocsHydrated();
    const bundle: BackupBundle = {
      app: 'reseau-audit',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: this._state(),
      docs: {},
    };
    for (const k of this.listDocKeys()) {
      const id = k.replace(DOC_KEY_PREFIX, '');
      const doc = this.getDoc(id);
      if (doc) bundle.docs[k] = JSON.stringify(doc);
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
            const id = k.replace(DOC_KEY_PREFIX, '');
            this.setDoc(id, JSON.parse(bundle.docs[k]) as StoredDoc);
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
