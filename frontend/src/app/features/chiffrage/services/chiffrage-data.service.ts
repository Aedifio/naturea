import { computed, inject, Injectable, Injector, signal } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { StorageKey } from '../../../core/models/storage-keys';
import { LocalStorageAdapter } from '../../../core/storage/local-storage.adapter';
import { FactoryService } from '../../../core/services/factory.service';
import { AgencyService } from '../../../core/services/agency.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { FIELD_TO_POSTE, FORM_SCHEMAS } from '../constants/chiffrage-form.constants';
import { REFS } from '../constants/chiffrage-refs.constants';
import type {
  ChiffrageExportBundle,
  ChiffrageProjet,
  CustomPosteInput,
  CustomPostesStore,
  FieldMappingType,
  FormFieldData,
  FormFieldSchema,
  FormOverridesStore,
  HeaderStats,
  ImportHistoryEntry,
  ImportHistoryPoste,
  OverridesStore,
  PosteOverride,
  PosteRef,
  UsineKey,
  UsineRef,
} from '../chiffrage.models';
import { EMPTY_CHARPENTE_EXT } from '../chiffrage.models';

@Injectable({ providedIn: 'root' })
export class ChiffrageDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly factory = inject(FactoryService);
  private readonly storage = inject(LocalStorageAdapter);
  private readonly injector = inject(Injector);

  readonly overrides = signal<OverridesStore>({});
  readonly customPostes = signal<CustomPostesStore>({});
  readonly formOverrides = signal<FormOverridesStore>({});
  readonly projets = signal<ChiffrageProjet[]>([]);
  private readonly _tarifsHistory = signal<ImportHistoryEntry[]>([]);

  /** REFS postes + factory metadata; updates when factories load from Supabase. */
  readonly usineKeys = computed(() => {
    this.factory.factories();
    return this.getAllUsineKeys();
  });

  async load(): Promise<void> {
    const [ovRes, cpRes, foRes, projRes, histRes] = await Promise.all([
      this.supabase.from('chiffrage_overrides').select('data').eq('id', 1).maybeSingle(),
      this.supabase.from('chiffrage_custom_postes').select('data').eq('id', 1).maybeSingle(),
      this.supabase.from('chiffrage_form_overrides').select('data').eq('id', 1).maybeSingle(),
      this.supabase
        .from('chiffrage_projets')
        .select(
          '*, factory:factory_id(id, key, nom), agency:agency_id(id, name), creator:created_by(id, name, role)',
        )
        .order('projet_date', { ascending: false }),
      this.supabase
        .from('chiffrage_tarifs_imports')
        .select('*, factory:factory_id(id, key, nom)')
        .order('date_import', { ascending: false }),
    ]);

    this.overrides.set((ovRes.data?.data as OverridesStore) ?? {});
    this.customPostes.set((cpRes.data?.data as CustomPostesStore) ?? {});
    this.formOverrides.set((foRes.data?.data as FormOverridesStore) ?? {});

    const dbProjets = this.mapProjetsFromRows(projRes.data ?? []);
    const localProjets = this.readLocalProjets();
    let merged = this.mergeProjets(dbProjets, localProjets);

    if (projRes.error) {
      console.warn('[Chiffrage] projets load failed, using localStorage', projRes.error);
      merged = localProjets.length ? localProjets : dbProjets;
    } else {
      const dbIds = new Set(dbProjets.map((p) => p.id));
      const toMigrate = localProjets.filter((p) => !dbIds.has(p.id));
      if (toMigrate.length) {
        await Promise.all(toMigrate.map((p) => this.persistProjetToDb(p)));
        this.storage.remove(StorageKey.ChiffrageProjets);
      }
    }

    this.projets.set(merged);
    this.syncProjetsToLocalStorage();

    const imports = histRes.data ?? [];
    if (imports.length) {
      const { data: postes } = await this.supabase.from('chiffrage_tarifs_postes').select('*');
      const postesByImport = new Map<string, ImportHistoryEntry['postes']>();
      for (const row of postes ?? []) {
        const list = postesByImport.get(row.import_id) ?? [];
        list.push({
          label_pdf: row.label_pdf ?? '',
          unite: row.unite ?? '',
          qte: Number(row.qte) || 0,
          pu: Number(row.pu) || 0,
          total: Number(row.total) || 0,
          mapped: row.mapped ?? null,
          ancien_pu: row.ancien_pu != null ? Number(row.ancien_pu) : null,
          delta_pct: row.delta_pct != null ? Number(row.delta_pct) : null,
          applique: Boolean(row.applique),
        } satisfies ImportHistoryPoste);
        postesByImport.set(row.import_id, list);
      }
      this._tarifsHistory.set(
        imports.map((h) => {
          const row = h as Record<string, unknown>;
          const entry = this.mapTarifImportRow(row);
          entry.postes = postesByImport.get(String(row['id'])) ?? [];
          return entry;
        }),
      );
    } else {
      this._tarifsHistory.set([]);
    }
  }

  /** Re-read persisted state (matches chiffrage-app.html loadMesProjets on each tab open). */
  hydrateFromStorage(): void {
    void this.load();
  }

  readProjetsFromStorage(): ChiffrageProjet[] {
    return this.projets();
  }

  readonly headerStats = computed<HeaderStats>(() => {
    let totalPostes = 0;
    Object.values(REFS).forEach((u) => {
      totalPostes += Object.keys(u.postes).length;
    });
    const usineCount = this.factory.getAll().length || Object.keys(REFS).length;
    return {
      usines: usineCount,
      devis: this._tarifsHistory().length,
      postes: totalPostes,
    };
  });

  /** Alias for shell component */
  readonly headStats = this.headerStats;

  readonly mesProjetsCount = computed(() => this.projets().length);

  readonly tarifsHistoryCount = computed(() => this._tarifsHistory().length);

  readonly hasPersonalizations = computed(() => {
    return (
      Object.keys(this.overrides()).length > 0 ||
      Object.keys(this.customPostes()).length > 0 ||
      Object.keys(this.formOverrides()).length > 0
    );
  });

  getUsineRef(key: UsineKey | string): UsineRef {
    const hardcoded = REFS[key as UsineKey];
    const meta = this.factory.getByKey(key);
    if (hardcoded && meta) {
      return {
        ...hardcoded,
        nom: meta.nom,
        couleur: meta.couleur,
        description: meta.description ?? hardcoded.description,
        derniere_maj: meta.updated_at?.slice(0, 10) ?? hardcoded.derniere_maj,
      } as UsineRef;
    }
    if (hardcoded) return hardcoded as UsineRef;
    if (meta) {
      return {
        nom: meta.nom,
        couleur: meta.couleur,
        description: meta.description ?? '',
        devis_count: 0,
        derniere_maj: meta.updated_at?.slice(0, 10) ?? '',
        postes: {},
      };
    }
    return {
      nom: String(key),
      couleur: '#6b7280',
      description: '',
      devis_count: 0,
      derniere_maj: '',
      postes: {},
    };
  }

  getUsineLabel(key: string): string {
    return this.factory.getNom(key) || REFS[key as UsineKey]?.nom || key;
  }

  getFactoryUpdatedAt(key: UsineKey): string | null {
    return this.factory.getByKey(key)?.updated_at ?? REFS[key]?.derniere_maj ?? null;
  }

  /** Union of REFS (postes/tarifs) and active factories from Supabase. */
  getAllUsineKeys(): UsineKey[] {
    const keys = new Set<string>([
      ...Object.keys(REFS),
      ...this.factory.getAll().map((f) => f.key),
    ]);
    return [...keys].sort((a, b) =>
      this.getUsineLabel(a).localeCompare(this.getUsineLabel(b), 'fr'),
    ) as UsineKey[];
  }

  isCustomPoste(usineKey: UsineKey, posteCode: string): boolean {
    return !!this.customPostes()[usineKey]?.[posteCode];
  }

  getCustomPoste(usineKey: UsineKey, posteCode: string): PosteRef | null {
    if (!this.isCustomPoste(usineKey, posteCode)) return null;
    return this.customPostes()[usineKey]![posteCode]!;
  }

  getPoste(usineKey: UsineKey, posteCode: string): PosteRef | null {
    let base: PosteRef | undefined = REFS[usineKey]?.postes[posteCode as keyof (typeof REFS)[UsineKey]['postes']];
    if (!base && this.isCustomPoste(usineKey, posteCode)) {
      base = this.getCustomPoste(usineKey, posteCode) ?? undefined;
    }
    if (!base) return null;

    const ov = this.overrides()[usineKey]?.[posteCode] ?? {};
    return {
      ...base,
      label_user: ov.label_user !== undefined ? ov.label_user : base.label_user,
      tooltip: ov.tooltip !== undefined ? ov.tooltip : base.tooltip,
      visible: ov.visible !== undefined ? ov.visible : base.visible,
      custom: base.custom === true,
    };
  }

  getPrixCalcule(usineKey: UsineKey, posteCode: string, depth = 0): number {
    if (depth > 5) {
      const fb =
        (REFS[usineKey]?.postes as Record<string, PosteRef> | undefined)?.[posteCode] ??
        this.getCustomPoste(usineKey, posteCode);
      return fb?.moyen ?? 0;
    }

    let base: PosteRef | undefined = REFS[usineKey]?.postes[posteCode as keyof (typeof REFS)[UsineKey]['postes']];
    if (!base) base = this.getCustomPoste(usineKey, posteCode) ?? undefined;
    if (!base) return 0;

    const ov = this.overrides()[usineKey]?.[posteCode] ?? {};
    if (ov.prix_type === 'fixe' && ov.prix_unitaire !== undefined && ov.prix_unitaire !== '') {
      return parseFloat(String(ov.prix_unitaire)) || base.moyen;
    }
    if (ov.prix_type === 'ratio' && ov.ratio_source && ov.ratio_value) {
      const src = this.getPrixCalcule(usineKey, ov.ratio_source, depth + 1);
      return src * parseFloat(String(ov.ratio_value));
    }
    return base.moyen;
  }

  hasPrixOverride(usineKey: UsineKey, posteCode: string): boolean {
    const ov = this.overrides()[usineKey]?.[posteCode] ?? {};
    return ov.prix_type === 'fixe' || ov.prix_type === 'ratio';
  }

  hasOverride(usineKey: UsineKey, posteCode: string): boolean {
    const ov = this.overrides()[usineKey]?.[posteCode];
    return !!ov && Object.keys(ov).length > 0;
  }

  setOverride(usineKey: UsineKey, posteCode: string, field: keyof PosteOverride, value: unknown): void {
    const base = REFS[usineKey]?.postes[posteCode as keyof (typeof REFS)[UsineKey]['postes']] ?? this.getCustomPoste(usineKey, posteCode);
    if (!base) return;

    const prixFields = ['prix_type', 'prix_unitaire', 'ratio_source', 'ratio_value'];
    const baseRecord = base as unknown as Record<string, unknown>;

    this.overrides.update((all) => {
      const next = { ...all };
      if (!next[usineKey]) next[usineKey] = {};
      if (!next[usineKey]![posteCode]) next[usineKey]![posteCode] = {};
      const ov = next[usineKey]![posteCode]!;

      if (!prixFields.includes(field) && value === baseRecord[field]) {
        delete (ov as Record<string, unknown>)[field];
        if (Object.keys(ov).length === 0) delete next[usineKey]![posteCode];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      } else if (value === undefined) {
        delete (ov as Record<string, unknown>)[field];
        if (Object.keys(ov).length === 0) delete next[usineKey]![posteCode];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      } else {
        (ov as Record<string, unknown>)[field] = value;
      }
      return next;
    });
    this.persistOverrides();
  }

  resetPoste(usineKey: UsineKey, posteCode: string): void {
    this.overrides.update((all) => {
      const next = { ...all };
      if (next[usineKey]?.[posteCode]) {
        delete next[usineKey]![posteCode];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      }
      return next;
    });
    this.persistOverrides();
  }

  resetPrix(usineKey: UsineKey, posteCode: string): void {
    this.overrides.update((all) => {
      const next = { ...all };
      const ov = next[usineKey]?.[posteCode];
      if (!ov) return all;

      delete ov.prix_type;
      delete ov.prix_unitaire;
      delete ov.ratio_source;
      delete ov.ratio_value;
      if (Object.keys(ov).length === 0) {
        delete next[usineKey]![posteCode];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      }
      return next;
    });
    this.persistOverrides();
  }

  getAllPosteCodes(usineKey: UsineKey): string[] {
    const base = Object.keys(REFS[usineKey]?.postes ?? {});
    const custom = Object.keys(this.customPostes()[usineKey] ?? {});
    return [...base, ...custom];
  }

  getEffectiveFieldMap(usineKey: UsineKey): Record<string, { poste: string; type: FieldMappingType }> {
    const base = { ...FIELD_TO_POSTE[usineKey] } as Record<string, { poste: string; type: FieldMappingType }>;
    const cp = this.customPostes()[usineKey] ?? {};
    Object.entries(cp).forEach(([code, data]) => {
      if (data.form_field?.field_id) {
        base[data.form_field.field_id] = {
          poste: code,
          type: (data.form_field.type || 'surface') as FieldMappingType,
        };
      }
    });
    return base;
  }

  getCustomFieldsForSection(usineKey: UsineKey, sectionLabel: string): FormFieldSchema[] {
    const cp = this.customPostes()[usineKey] ?? {};
    return Object.entries(cp)
      .filter(([, data]) => data.form_field?.section === sectionLabel)
      .map(([code, data]) => ({
        id: data.form_field!.field_id,
        label: data.label_user,
        unit: data.form_field!.unit ?? '',
        hint: data.form_field!.hint ?? '',
        _custom_code: code,
      }));
  }

  getUsineSections(usineKey: UsineKey): string[] {
    const schema = FORM_SCHEMAS[usineKey] ?? [];
    return schema.filter((i) => i.section).map((i) => i.section!);
  }

  buildEffectiveSchema(usineKey: UsineKey): FormFieldSchema[] {
    const baseSchema = FORM_SCHEMAS[usineKey] ?? [];
    const result: FormFieldSchema[] = [];
    let currentSection: string | null = null;

    const flushCustom = (): void => {
      if (!currentSection) return;
      this.getCustomFieldsForSection(usineKey, currentSection).forEach((c) => result.push(c));
    };

    baseSchema.forEach((item) => {
      if (item.section) {
        flushCustom();
        currentSection = item.section;
        result.push(item);
      } else {
        result.push(item);
      }
    });
    flushCustom();
    return result;
  }

  addCustomPoste(usineKey: UsineKey, code: string, data: CustomPosteInput): void {
    this.customPostes.update((all) => {
      const next = { ...all };
      if (!next[usineKey]) next[usineKey] = {};
      next[usineKey]![code] = {
        label_user: data.label_user,
        label_pdf: data.label_pdf ?? data.label_user,
        tooltip: data.tooltip ?? '',
        unite: data.unite,
        moyen: data.moyen ?? 0,
        min: data.moyen ?? 0,
        max: data.moyen ?? 0,
        n: 1,
        fiabilite: 'faible',
        visible: true,
        custom: true,
        created_at: new Date().toISOString(),
        form_field: data.form_field,
      };
      return next;
    });
    this.persistCustomPostes();
  }

  deleteCustomPoste(usineKey: UsineKey, code: string): void {
    this.customPostes.update((all) => {
      const next = { ...all };
      if (next[usineKey]?.[code]) {
        delete next[usineKey]![code];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      }
      return next;
    });
    this.persistCustomPostes();

    if (this.overrides()[usineKey]?.[code]) {
      this.resetPoste(usineKey, code);
    }
  }

  generatePosteCode(usineKey: UsineKey, label: string): string {
    let base = label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 40);
    if (!base) base = 'poste_custom';

    let code = base;
    let i = 2;
    while (REFS[usineKey]?.postes[code as keyof (typeof REFS)[UsineKey]['postes']] || this.customPostes()[usineKey]?.[code]) {
      code = `${base}_${i}`;
      i++;
    }
    return code;
  }

  generateFieldId(usineKey: UsineKey, code: string, unit: string): string {
    const suffix =
      unit === 'm²' || unit === 'm2'
        ? '_m2'
        : unit === 'm³' || unit === 'm3'
          ? '_m3'
          : unit === 'ML' || unit === 'ml'
            ? '_ml'
            : unit === 'u' || unit === 'U'
              ? '_qty'
              : '';
    const fieldBase = code + suffix;
    const effMap = this.getEffectiveFieldMap(usineKey);
    let fid = fieldBase;
    let i = 2;
    while (effMap[fid]) {
      fid = `${fieldBase}_${i}`;
      i++;
    }
    return fid;
  }

  deduceMappingType(unite: string): FieldMappingType {
    const u = (unite || '').toLowerCase();
    if (u === 'm2' || u === 'm²') return 'surface';
    if (u === 'm3' || u === 'm³') return 'volume';
    if (u === 'u' || u === 'ml' || u === 'frt') return 'unite';
    if (u === 'forfait' || u === 'ens') return 'forfait_qty';
    return 'surface';
  }

  normalizeUniteForDisplay(unite: string): string {
    const u = (unite || '').toUpperCase();
    if (u === 'M2') return 'm²';
    if (u === 'M3') return 'm³';
    if (u === 'ML') return 'ml';
    if (u === 'U') return 'u';
    if (u === 'ENS' || u === 'FRT' || u === 'FORFAIT') return 'forfait';
    return u.toLowerCase();
  }

  getFormFieldData(usineKey: UsineKey, fieldId: string): FormFieldData {
    const field = FORM_SCHEMAS[usineKey]?.find((f) => f.id === fieldId);
    if (!field) return { hint: '', hint_visible: true, modified: false };

    const ov = this.formOverrides()[usineKey]?.[fieldId] ?? {};
    return {
      hint: ov.hint !== undefined ? ov.hint : (field.hint ?? ''),
      hint_visible: ov.hint_visible !== undefined ? ov.hint_visible : true,
      modified: !!(
        this.formOverrides()[usineKey]?.[fieldId] &&
        Object.keys(this.formOverrides()[usineKey]![fieldId]!).length
      ),
    };
  }

  setFormOverride(
    usineKey: UsineKey,
    fieldId: string,
    field: 'hint' | 'hint_visible',
    value: string | boolean,
  ): void {
    const baseField = FORM_SCHEMAS[usineKey]?.find((f) => f.id === fieldId);
    const baseVal = field === 'hint_visible' ? true : baseField?.hint;

    this.formOverrides.update((all) => {
      const next = { ...all };
      if (!next[usineKey]) next[usineKey] = {};
      if (!next[usineKey]![fieldId]) next[usineKey]![fieldId] = {};
      const fo = next[usineKey]![fieldId]!;

      if (value === baseVal) {
        delete fo[field];
        if (Object.keys(fo).length === 0) delete next[usineKey]![fieldId];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      } else {
        fo[field] = value as never;
      }
      return next;
    });
    this.persistFormOverrides();
  }

  resetFormField(usineKey: UsineKey, fieldId: string): void {
    this.formOverrides.update((all) => {
      const next = { ...all };
      if (next[usineKey]?.[fieldId]) {
        delete next[usineKey]![fieldId];
        if (Object.keys(next[usineKey]!).length === 0) delete next[usineKey];
      }
      return next;
    });
    this.persistFormOverrides();
  }

  getFormFieldsForPoste(usineKey: UsineKey, posteCode: string): string[] {
    const map = this.getEffectiveFieldMap(usineKey);
    return Object.entries(map)
      .filter(([, mp]) => mp.poste === posteCode)
      .map(([fid]) => fid);
  }

  saveProjet(projet: ChiffrageProjet): void {
    const list = [projet, ...this.projets().filter((p) => p.id !== projet.id)];
    this.projets.set(list);
    this.syncProjetsToLocalStorage();
    void this.persistProjetToDb(projet);
  }

  deleteProjet(id: number): void {
    const list = this.projets().filter((p) => p.id !== id);
    this.projets.set(list);
    this.syncProjetsToLocalStorage();
    void this.supabase.from('chiffrage_projets').delete().eq('id', id);
  }

  getTarifsHistory(): ImportHistoryEntry[] {
    return this._tarifsHistory();
  }

  saveTarifsHistory(list: ImportHistoryEntry[]): void {
    this._tarifsHistory.set(list);
    void this.persistTarifsHistory(list);
  }

  private async persistTarifsHistory(list: ImportHistoryEntry[]): Promise<void> {
    for (const entry of list) {
      const factoryId = entry.factoryId || this.resolveFactoryId(entry.usine);
      if (!factoryId) {
        console.warn('[Chiffrage] skip tarif import persist: unknown factory', entry.usine);
        continue;
      }

      await this.supabase.from('chiffrage_tarifs_imports').upsert({
        id: String(entry.id),
        date_import: entry.date_import,
        filename: entry.filename,
        factory_id: factoryId,
        devis_num: entry.devis_num,
        devis_date: entry.devis_date,
        client: entry.client,
        total_ht: entry.total_ht,
      });
      if (entry.postes?.length) {
        await this.supabase.from('chiffrage_tarifs_postes').delete().eq('import_id', String(entry.id));
        await this.supabase.from('chiffrage_tarifs_postes').insert(
          entry.postes.map((p) => ({
            import_id: String(entry.id),
            label_pdf: p.label_pdf,
            applique: p.applique ?? false,
            delta_pct: p.delta_pct,
          })),
        );
      }
    }
  }

  deleteTarifImport(id: number): void {
    const list = this.getTarifsHistory().filter((h) => h.id !== id);
    this.saveTarifsHistory(list);
  }

  /** @deprecated use exportBundle */
  exportOverridesJson(): string {
    return JSON.stringify(this.exportBundle(), null, 2);
  }

  /** @deprecated use importBundle */
  importOverridesJson(json: string): void {
    this.importBundle(JSON.parse(json) as ChiffrageExportBundle);
  }

  exportBundle(): ChiffrageExportBundle | null {
    if (!this.hasPersonalizations()) return null;
    return {
      version: 3,
      exportedAt: new Date().toISOString(),
      overrides: this.overrides(),
      custom_postes: this.customPostes(),
      form_overrides: this.formOverrides(),
    };
  }

  importBundle(data: Partial<ChiffrageExportBundle>): boolean {
    if (!data.overrides && !data.custom_postes) return false;

    this.overrides.set(data.overrides ?? {});
    this.customPostes.set(data.custom_postes ?? {});
    this.formOverrides.set(data.form_overrides ?? {});
    this.persistOverrides();
    this.persistCustomPostes();
    this.persistFormOverrides();
    return true;
  }

  resetAll(): void {
    this.overrides.set({});
    this.customPostes.set({});
    this.formOverrides.set({});
    this.persistOverrides();
    this.persistCustomPostes();
    this.persistFormOverrides();
  }

  /** @deprecated use resetAll */
  resetAllOverrides(): void {
    this.resetAll();
  }

  countCustomPostes(): number {
    return Object.values(this.customPostes()).reduce(
      (acc, usine) => acc + Object.keys(usine ?? {}).length,
      0,
    );
  }

  countOverrides(): number {
    return Object.values(this.overrides()).reduce(
      (acc, usine) => acc + Object.keys(usine ?? {}).length,
      0,
    );
  }

  getActiveAgence(): string | null {
    const id = this.getActiveAgencyId();
    if (id != null) {
      return this.injector.get(AgencyService).getById(id)?.name ?? null;
    }
    return this.injector.get(AuthService).currentUser()?.franchise ?? null;
  }

  getActiveAgencyId(): number | null {
    const auth = this.injector.get(AuthService);
    const linked = auth.linkedAgencyId();
    if (linked != null) return linked;
    const label = auth.currentUser()?.franchise;
    if (!label || label === '(siège)') return null;
    return this.injector.get(AgencyService).resolveAgencyId(label);
  }

  resolveFactoryId(usine: UsineKey): number | null {
    return this.factory.getByKey(usine)?.id ?? null;
  }

  getCurrentCreatorId(): string | null {
    return this.injector.get(AuthService).portalUserId();
  }

  getActiveCreatorName(): string | null {
    return this.injector.get(AuthService).currentUser()?.name ?? null;
  }

  private persistOverrides(): void {
    void this.supabase.from('chiffrage_overrides').upsert({ id: 1, data: this.overrides() });
  }

  private readLocalProjets(): ChiffrageProjet[] {
    const raw = this.storage.get<ChiffrageProjet[]>(StorageKey.ChiffrageProjets);
    if (!Array.isArray(raw)) return [];
    return raw.map((p) => this.normalizeProjet(p));
  }

  private mapTarifImportRow(h: Record<string, unknown>): ImportHistoryEntry {
    const factory = this.parseJoinedRow<{ id: number; key: string; nom: string }>(h['factory']);
    const legacyUsine = h['usine'] as UsineKey | undefined;
    const factoryFromKey = legacyUsine ? this.factory.getByKey(legacyUsine) : null;
    const resolvedFactory = factory ?? factoryFromKey;
    const factoryId = Number(h['factory_id'] ?? resolvedFactory?.id ?? 0);
    const usine = (resolvedFactory?.key ?? legacyUsine ?? 'boisboreal') as UsineKey;
    const idRaw = h['id'];

    return {
      id: typeof idRaw === 'number' ? idRaw : Number(idRaw),
      date_import: String(h['date_import'] ?? new Date().toISOString()),
      filename: String(h['filename'] ?? ''),
      factoryId,
      usine,
      devis_num: (h['devis_num'] as string | null) ?? null,
      devis_date: (h['devis_date'] as string | null) ?? null,
      client: (h['client'] as string | null) ?? null,
      total_ht: h['total_ht'] != null ? Number(h['total_ht']) : null,
      postes: [],
    };
  }

  private mapProjetsFromRows(rows: Record<string, unknown>[]): ChiffrageProjet[] {
    return rows.map((p) => this.normalizeProjet(this.rowToProjetPartial(p)));
  }

  private rowToProjetPartial(p: Record<string, unknown>): Partial<ChiffrageProjet> & { id: number } {
    const factory = this.parseJoinedRow<{ id: number; key: string; nom: string }>(p['factory']);
    const agency = this.parseJoinedRow<{ id: number; name: string }>(p['agency']);
    const creator = this.parseJoinedRow<{ id: string; name: string; role: string }>(p['creator']);
    const legacyUsine = p['usine'] as UsineKey | undefined;
    const factoryFromKey = legacyUsine ? this.factory.getByKey(legacyUsine) : null;
    const resolvedFactory = factory ?? factoryFromKey;
    const factoryId = Number(p['factory_id'] ?? resolvedFactory?.id ?? 0);
    const usine = (resolvedFactory?.key ?? legacyUsine ?? 'boisboreal') as UsineKey;

    return {
      id: Number(p['id']),
      nom: String(p['nom'] ?? ''),
      ref: String(p['ref'] ?? ''),
      factoryId,
      agencyId: agency?.id ?? (p['agency_id'] != null ? Number(p['agency_id']) : null),
      usine,
      usineLabel: resolvedFactory?.nom ?? String(p['usine_label'] ?? this.getUsineLabel(usine)),
      agence: agency?.name ?? (p['agence'] as string | null) ?? null,
      total: Number(p['total']),
      date: String(p['projet_date'] ?? p['date'] ?? new Date().toISOString()),
      createdBy: creator?.id ?? (p['created_by'] as string | null) ?? null,
      createdByName: creator?.name ?? (p['user_name'] as string | null) ?? null,
      values: (p['values'] as Record<string, number>) ?? {},
      charpente_ext: (p['charpente_ext'] as ChiffrageProjet['charpente_ext']) ?? { ...EMPTY_CHARPENTE_EXT },
      lines: (p['lines'] as ChiffrageProjet['lines']) ?? [],
    };
  }

  private parseJoinedRow<T>(value: unknown): T | null {
    if (!value || typeof value !== 'object') return null;
    return value as T;
  }

  private normalizeProjet(p: Partial<ChiffrageProjet> & { id: number }): ChiffrageProjet {
    const usine = (p.usine ?? 'boisboreal') as UsineKey;
    const factoryId = p.factoryId ?? this.resolveFactoryId(usine) ?? 0;
    const factory = this.factory.getById(factoryId) ?? this.factory.getByKey(usine);
    const agencyId = p.agencyId ?? null;
    const agencyName =
      p.agence ??
      (agencyId != null ? this.injector.get(AgencyService).getById(agencyId)?.name ?? null : null);

    return {
      id: Number(p.id),
      nom: p.nom ?? '',
      ref: p.ref ?? '',
      factoryId,
      agencyId,
      usine: (factory?.key ?? usine) as UsineKey,
      usineLabel: p.usineLabel || factory?.nom || this.getUsineLabel(usine),
      agence: agencyName,
      total: Number(p.total) || 0,
      date: p.date ?? new Date().toISOString(),
      createdBy: p.createdBy ?? null,
      createdByName: p.createdByName ?? null,
      values: p.values ?? {},
      charpente_ext: p.charpente_ext ?? { ...EMPTY_CHARPENTE_EXT },
      lines: p.lines ?? [],
    };
  }

  private mergeProjets(db: ChiffrageProjet[], local: ChiffrageProjet[]): ChiffrageProjet[] {
    const byId = new Map<number, ChiffrageProjet>();
    for (const p of db) byId.set(p.id, p);
    for (const p of local) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }
    return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date));
  }

  private syncProjetsToLocalStorage(): void {
    this.storage.set(StorageKey.ChiffrageProjets, this.projets());
  }

  private async persistProjetToDb(projet: ChiffrageProjet): Promise<void> {
    const factoryId = projet.factoryId || this.resolveFactoryId(projet.usine);
    if (!factoryId) {
      console.warn('[Chiffrage] persist projet failed: unknown factory', projet.usine);
      return;
    }

    const { error } = await this.supabase.from('chiffrage_projets').upsert({
      id: projet.id,
      projet_date: projet.date,
      nom: projet.nom,
      ref: projet.ref,
      factory_id: factoryId,
      agency_id: projet.agencyId,
      created_by: projet.createdBy,
      total: projet.total,
      values: projet.values ?? {},
      charpente_ext: projet.charpente_ext ?? { ...EMPTY_CHARPENTE_EXT },
      lines: projet.lines ?? [],
    });
    if (error) console.warn('[Chiffrage] persist projet failed', error);
  }

  private persistCustomPostes(): void {
    void this.supabase.from('chiffrage_custom_postes').upsert({ id: 1, data: this.customPostes() });
  }

  private persistFormOverrides(): void {
    void this.supabase.from('chiffrage_form_overrides').upsert({ id: 1, data: this.formOverrides() });
  }
}
