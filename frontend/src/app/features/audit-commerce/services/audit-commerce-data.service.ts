import { computed, inject, Injectable, signal } from '@angular/core';
import { AgencyService } from '../../../core/services/agency.service';
import { FileStorageService } from '../../../core/storage/file-storage.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import type {
  Agency,
  AgencyObjectives,
  Audit,
  AuditCommerceState,
  BackupBundle,
  DocMeta,
  Employee,
  LeafData,
  StoredDoc,
} from '../audit-commerce.models';
import { DOC_KEY_PREFIX, LEAF_KIND } from '../constants/audit-commerce.constants';
import { defaultAuditId, newAuditDate, todayISO, uid } from '../utils/audit-commerce.utils';

interface CommerceExt {
  employees: Employee[];
  objectives: AgencyObjectives;
  documents: DocMeta[];
}

function emptyCommerceExt(): CommerceExt {
  return { employees: [], objectives: {}, documents: [] };
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

function normAudit(au: Audit): Audit {
  const audit = { ...au, leaves: { ...au.leaves }, empRatings: { ...au.empRatings } };
  if ((audit.status as string) === 'published') audit.status = 'validated';
  if (!audit.status) audit.status = 'draft';
  Object.keys(audit.leaves).forEach((id) => {
    audit.leaves[id] = normLeaf(id, audit.leaves[id]);
  });
  return audit;
}

function parseAgencyId(id: number | string): number | null {
  const n = typeof id === 'number' ? id : Number(id);
  return Number.isFinite(n) ? n : null;
}

@Injectable({ providedIn: 'root' })
export class AuditCommerceDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly files = inject(FileStorageService);
  private readonly agenciesSvc = inject(AgencyService);
  private readonly docCache = new Map<string, StoredDoc>();
  private docsHydrated = false;

  private readonly _commerceExt = signal<Map<number, CommerceExt>>(new Map());
  private readonly _auditsByAgencyId = signal<Map<number, Audit[]>>(new Map());
  private readonly _settings = signal<AuditCommerceState['settings']>({ threshold: 0.8, noteThreshold: 5 });

  /** Agency list: metadata from `agencies`, commerce data from audit-commerce tables. */
  readonly agencies = computed(() => {
    this.agenciesSvc.agencies();
    const extMap = this._commerceExt();
    const auditsMap = this._auditsByAgencyId();
    return this.agenciesSvc.getAll().map((a) => {
      const ext = extMap.get(a.id) ?? emptyCommerceExt();
      return {
        id: a.id,
        name: a.name,
        address: a.adresse ?? '',
        employees: ext.employees,
        objectives: ext.objectives,
        documents: ext.documents,
        audits: auditsMap.get(a.id) ?? [],
      };
    });
  });

  readonly settings = computed(() => this._settings());
  readonly state = computed(
    (): AuditCommerceState => ({
      version: 2,
      agencies: this.agencies(),
      settings: this._settings(),
    }),
  );

  async load(): Promise<void> {
    if (!this.agenciesSvc.ready()) {
      await this.agenciesSvc.load();
    }

    if (!this.agenciesSvc.getAll().length) {
      this.clearCaches();
      return;
    }

    const [settingsRes, extRes, auditsRes] = await Promise.all([
      this.supabase.from('audit_commerce_settings').select('*').eq('id', 1).maybeSingle(),
      this.supabase.from('audit_commerce_agencies').select('agency_id, objectives, employees, documents'),
      this.supabase.from('audit_commerce_audits').select('*').order('audit_date'),
    ]);

    if (extRes.error) {
      console.error('[AuditCommerce] load failed', extRes.error);
      this.clearCaches();
      return;
    }

    const extMap = new Map<number, CommerceExt>();
    for (const row of extRes.data ?? []) {
      extMap.set(row.agency_id, {
        employees: (row.employees as Employee[]) ?? [],
        objectives: (row.objectives as AgencyObjectives) ?? {},
        documents: (row.documents as DocMeta[]) ?? [],
      });
    }

    const auditsByAgencyId = new Map<number, Audit[]>();
    for (const a of auditsRes.data ?? []) {
      const audit = normAudit({
        id: a.id,
        date: a.audit_date,
        status: a.status as Audit['status'],
        leaves: a.leaves ?? {},
        empRatings: a.emp_ratings ?? {},
        note: a.note ?? '',
      });
      const list = auditsByAgencyId.get(a.agency_id) ?? [];
      list.push(audit);
      auditsByAgencyId.set(a.agency_id, list);
    }

    const settingsRow = settingsRes.data;
    this._commerceExt.set(extMap);
    this._auditsByAgencyId.set(auditsByAgencyId);
    this._settings.set(
      settingsRow
        ? { threshold: Number(settingsRow.threshold), noteThreshold: Number(settingsRow.note_threshold) }
        : { threshold: 0.8, noteThreshold: 5 },
    );
  }

  private clearCaches(): void {
    this._commerceExt.set(new Map());
    this._auditsByAgencyId.set(new Map());
  }

  private async persistSettings(): Promise<void> {
    const settings = this._settings();
    await this.supabase.from('audit_commerce_settings').upsert({
      id: 1,
      version: 2,
      threshold: settings.threshold,
      note_threshold: settings.noteThreshold,
    });
  }

  private async persistAgency(agencyId: number): Promise<void> {
    const ag = this.getAgency(agencyId);
    if (!ag) return;

    await this.supabase.from('audit_commerce_agencies').upsert(
      {
        agency_id: ag.id,
        objectives: ag.objectives ?? {},
        employees: ag.employees ?? [],
        documents: ag.documents ?? [],
      },
      { onConflict: 'agency_id' },
    );

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

  getAgency(id: number | string): Agency | undefined {
    const agencyId = parseAgencyId(id);
    if (agencyId == null) return undefined;
    return this.agencies().find((a) => a.id === agencyId);
  }

  getAudit(agencyId: number | string, auditId: string): Audit | undefined {
    const id = parseAgencyId(agencyId);
    if (id == null) return undefined;
    return this.getAgency(id)?.audits.find((a) => a.id === auditId);
  }

  updateSettings(patch: Partial<AuditCommerceState['settings']>): void {
    this._settings.update((s) => ({ ...s, ...patch }));
    void this.persistSettings();
  }

  updateAgency(agencyId: number | string, patch: Partial<Pick<Agency, 'objectives'>>): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._commerceExt.update((m) => {
      const next = new Map(m);
      const ext = { ...(next.get(id) ?? emptyCommerceExt()) };
      if (patch.objectives) ext.objectives = { ...ext.objectives, ...patch.objectives };
      next.set(id, ext);
      return next;
    });
    void this.persistAgency(id);
  }

  addEmployee(agencyId: number | string): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._commerceExt.update((m) => {
      const next = new Map(m);
      const ext = { ...(next.get(id) ?? emptyCommerceExt()), employees: [...(next.get(id)?.employees ?? [])] };
      ext.employees.push({ id: uid(), name: '', role: '' });
      next.set(id, ext);
      return next;
    });
    void this.persistAgency(id);
  }

  updateEmployee(agencyId: number | string, empId: string, field: 'name' | 'role', value: string): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._commerceExt.update((m) => {
      const next = new Map(m);
      const ext = structuredClone(next.get(id) ?? emptyCommerceExt());
      const emp = ext.employees.find((e) => e.id === empId);
      if (!emp) return m;
      emp[field] = value;
      next.set(id, ext);
      return next;
    });
    void this.persistAgency(id);
  }

  deleteEmployee(agencyId: number | string, empId: string): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._commerceExt.update((m) => {
      const next = new Map(m);
      const ext = structuredClone(next.get(id) ?? emptyCommerceExt());
      ext.employees = ext.employees.filter((e) => e.id !== empId);
      next.set(id, ext);
      return next;
    });
    void this.persistAgency(id);
  }

  newAudit(agencyId: number | string, ym: string): Audit {
    const id = parseAgencyId(agencyId);
    if (id == null) throw new Error('Agency not found');
    const au: Audit = {
      id: uid(),
      date: newAuditDate(ym),
      status: 'draft',
      leaves: {},
      empRatings: {},
      note: '',
    };
    this._auditsByAgencyId.update((m) => {
      const next = new Map(m);
      next.set(id, [...(next.get(id) ?? []), au]);
      return next;
    });
    void this.persistAgency(id);
    return au;
  }

  updateAudit(agencyId: number | string, auditId: string, patch: Partial<Audit>): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._auditsByAgencyId.update((m) => {
      const next = new Map(m);
      const audits = structuredClone(next.get(id) ?? []);
      const au = audits.find((a) => a.id === auditId);
      if (!au) return m;
      Object.assign(au, patch);
      if (patch.leaves) au.leaves = patch.leaves;
      if (patch.empRatings) au.empRatings = patch.empRatings;
      next.set(id, audits);
      return next;
    });
    void this.persistAgency(id);
  }

  setAuditStatus(agencyId: number | string, auditId: string, status: Audit['status']): void {
    this.updateAudit(agencyId, auditId, { status });
  }

  deleteAudit(agencyId: number | string, auditId: string): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._auditsByAgencyId.update((m) => {
      const next = new Map(m);
      next.set(id, (next.get(id) ?? []).filter((a) => a.id !== auditId));
      return next;
    });
    void this.persistAgency(id);
  }

  ensureLeaf(agencyId: number | string, auditId: string, leafId: string): LeafData {
    const id = parseAgencyId(agencyId);
    if (id == null) throw new Error('Agency not found');
    let leaf!: LeafData;
    this._auditsByAgencyId.update((m) => {
      const next = new Map(m);
      const audits = structuredClone(next.get(id) ?? []);
      const au = audits.find((a) => a.id === auditId);
      if (!au) throw new Error('Audit not found');
      au.leaves = au.leaves ?? {};
      if (!au.leaves[leafId]) {
        au.leaves[leafId] = LEAF_KIND[leafId] === 'text' ? { text: '', note: '' } : { rows: [], note: '' };
      }
      leaf = au.leaves[leafId];
      next.set(id, audits);
      return next;
    });
    void this.persistAgency(id);
    return leaf;
  }

  mutateAudit(agencyId: number | string, auditId: string, fn: (au: Audit, ag: Agency) => void): void {
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    const ag = this.getAgency(id);
    if (!ag) return;
    this._auditsByAgencyId.update((m) => {
      const next = new Map(m);
      const audits = structuredClone(next.get(id) ?? []);
      const au = audits.find((a) => a.id === auditId);
      if (!au) return m;
      fn(au, ag);
      next.set(id, audits);
      return next;
    });
    void this.persistAgency(id);
  }

  resolveDefaultAuditId(agencyId: number | string, ym: string): string | null {
    const id = parseAgencyId(agencyId);
    if (id == null) return null;
    return defaultAuditId(this.getAgency(id), ym);
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

  addDocument(agencyId: number | string, meta: DocMeta, payload: StoredDoc): void {
    this.setDoc(meta.id, payload);
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._commerceExt.update((m) => {
      const next = new Map(m);
      const ext = structuredClone(next.get(id) ?? emptyCommerceExt());
      ext.documents.unshift(meta);
      next.set(id, ext);
      return next;
    });
    void this.persistAgency(id);
  }

  removeDocument(agencyId: number | string, docId: string): void {
    this.deleteDoc(docId);
    const id = parseAgencyId(agencyId);
    if (id == null) return;
    this._commerceExt.update((m) => {
      const next = new Map(m);
      const ext = structuredClone(next.get(id) ?? emptyCommerceExt());
      ext.documents = ext.documents.filter((d) => d.id !== docId);
      next.set(id, ext);
      return next;
    });
    void this.persistAgency(id);
  }

  async exportBackup(): Promise<void> {
    await this.ensureDocsHydrated();
    const bundle: BackupBundle = {
      app: 'reseau-audit',
      version: 2,
      exportedAt: new Date().toISOString(),
      data: this.state(),
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
      this.applyImportedState(data);
      return this.agencies().length;
    });
  }

  replaceState(state: AuditCommerceState): void {
    this.applyImportedState(state);
  }

  private applyImportedState(data: AuditCommerceState): void {
    const extMap = new Map<number, CommerceExt>();
    const auditsMap = new Map<number, Audit[]>();
    const canonicalByName = new Map(this.agenciesSvc.getAll().map((a) => [a.name.trim().toLowerCase(), a.id]));

    for (const ag of data.agencies) {
      let agencyId = typeof ag.id === 'number' ? ag.id : null;
      if (agencyId == null || !this.agenciesSvc.getById(agencyId)) {
        agencyId = canonicalByName.get(ag.name.trim().toLowerCase()) ?? null;
      }
      if (agencyId == null) continue;

      extMap.set(agencyId, {
        employees: ag.employees ?? [],
        objectives: ag.objectives ?? {},
        documents: ag.documents ?? [],
      });
      auditsMap.set(agencyId, (ag.audits ?? []).map(normAudit));
    }

    this._commerceExt.set(extMap);
    this._auditsByAgencyId.set(auditsMap);
    this._settings.set({ ...{ threshold: 0.8, noteThreshold: 5 }, ...data.settings });

    void this.persistSettings();
    for (const agencyId of new Set([...extMap.keys(), ...auditsMap.keys()])) {
      void this.persistAgency(agencyId);
    }
  }
}
