import type { REFS } from './constants/chiffrage-refs.constants';

export type UsineKey = keyof typeof REFS;

export type Fiabilite = 'haute' | 'moyenne' | 'faible';

export type FieldMappingType = 'surface' | 'unite' | 'volume' | 'forfait_qty' | 'direct';

export type PrixType = 'auto' | 'fixe' | 'ratio';

export interface PosteRef {
  label_user: string;
  label_pdf: string;
  tooltip: string;
  unite: string;
  moyen: number;
  min: number;
  max: number;
  n: number;
  fiabilite: Fiabilite;
  visible: boolean;
  custom?: boolean;
  created_at?: string;
  form_field?: CustomFormField;
}

/** Alias used in legacy HTML naming */
export type Poste = PosteRef;

export interface UsineRef {
  nom: string;
  couleur: string;
  devis_count: number;
  derniere_maj: string;
  description: string;
  postes: Record<string, PosteRef>;
}

export interface FieldMapping {
  poste: string;
  type: FieldMappingType;
}

export interface FormFieldSchema {
  section?: string;
  id?: string;
  label?: string;
  unit?: string;
  hint?: string;
  default?: number;
  ensemble?: boolean;
  _custom_code?: string;
}

/** Alias used in estimator API */
export type FormSchemaItem = FormFieldSchema;

export interface CustomFormField {
  field_id: string;
  type: FieldMappingType;
  section: string;
  unit?: string;
  hint?: string;
}

export interface CustomPosteInput {
  label_user: string;
  label_pdf?: string;
  tooltip?: string;
  unite: string;
  moyen?: number;
  form_field: CustomFormField;
}

export interface FormFieldData {
  hint: string;
  hint_visible: boolean;
  modified: boolean;
}

export interface PosteOverride {
  label_user?: string;
  tooltip?: string;
  visible?: boolean;
  prix_type?: PrixType;
  prix_unitaire?: number | string;
  ratio_source?: string;
  ratio_value?: number | string;
}

export type OverridesStore = Partial<Record<UsineKey, Record<string, PosteOverride>>>;

export type CustomPostesStore = Partial<Record<UsineKey, Record<string, PosteRef>>>;

export interface FormFieldOverride {
  hint?: string;
  hint_visible?: boolean;
}

export type FormOverridesStore = Partial<Record<UsineKey, Record<string, FormFieldOverride>>>;

export interface CharpenteExtValues {
  fermette_type: string;
  surface: number;
  pvc20: number;
  pvc25: number;
  sabliere: number;
  chev_s: number;
  chev_esc: number;
  chev_vlx: number;
  rive: number;
  devis_ext: number;
}

export interface RecapLine {
  label: string;
  detail: string;
  amount: number;
  fiab?: Fiabilite;
}

export interface CharpenteRecapLine extends RecapLine {
  kind: 'devis' | 'fermette' | 'accessoire';
}

export interface RecapResult {
  subtotal: number;
  totalGeneral: number;
  lines: RecapLine[];
  charpenteLines: CharpenteRecapLine[];
  charpenteTotal: number;
  hasAnyValue: boolean;
  showCharpenteWarning: boolean;
  fiabiliteBanner: 'warn' | 'medium' | 'high' | null;
  fiabiliteMessage: string;
}

export interface ChiffrageProjet {
  id: number;
  date: string;
  nom: string;
  ref: string;
  /** Canonical `factory.id`. */
  factoryId: number;
  /** Canonical `agencies.id` when the devis belongs to a franchise. */
  agencyId: number | null;
  /** Factory key — derived from `factory` for UI/routing. */
  usine: UsineKey;
  usineLabel: string;
  /** Agency display name — derived from `agencies`. */
  agence: string | null;
  total: number;
  /** `portal_users.id` of the user who saved this devis. */
  createdBy: string | null;
  /** Creator display name — derived from joined `portal_users`. */
  createdByName: string | null;
  values: Record<string, number>;
  charpente_ext: CharpenteExtValues;
  lines: Array<{ label: string; detail: string; amount: number }>;
}

/** Alias requested in service spec */
export type SavedProjet = ChiffrageProjet;

export interface ImportHistoryPoste {
  label_pdf: string;
  unite: string;
  qte: number;
  pu: number;
  total: number;
  mapped: string | null;
  ancien_pu: number | null;
  delta_pct: number | null;
  applique: boolean;
}

export interface ImportHistoryEntry {
  id: number;
  date_import: string;
  filename: string;
  /** Supabase Storage path in the `chiffrage` bucket. */
  storagePath?: string | null;
  /** Canonical `factory.id`. */
  factoryId: number;
  /** Factory key — derived from `factory` for UI. */
  usine: UsineKey;
  devis_num: string | null;
  devis_date: string | null;
  client: string | null;
  total_ht: number | null;
  postes: ImportHistoryPoste[];
}

export type ImportFileStatus = 'parsing' | 'ok' | 'scan' | 'err';

export interface ParsedImportMeta {
  devis_num?: string;
  devis_date?: string;
  client?: string;
  total_ht?: number | null;
}

export interface ParsedImportPoste {
  label_pdf: string;
  unite: string;
  qte: number;
  pu: number;
  total: number;
}

export interface ParsedImportData {
  usine: UsineKey | null;
  meta: ParsedImportMeta;
  postes: ParsedImportPoste[];
  text: string;
}

export interface ImportQueueEntry {
  file: File;
  name: string;
  status: ImportFileStatus;
  error?: string;
  parsed?: ParsedImportData;
}

export interface ImportPreviewPoste extends ParsedImportPoste {
  mapped: string | null;
  ancien_pu: number | null;
  delta_pct: number | null;
  applique: boolean;
}

export interface CurrentImportState {
  fileEntry: ImportQueueEntry;
  usine: UsineKey | null;
  meta: ParsedImportMeta;
  postes: ImportPreviewPoste[];
}

export interface HistoryUsineStat {
  usine: UsineKey;
  avg: number;
  n: number;
}

export interface TarifImportHistory {
  id: string;
  usine: UsineKey;
  devis_num?: string;
  client?: string;
  devis_date?: string;
  total_ht?: number;
  imported_at: string;
  postes?: Array<{ label: string; unite: string; qte: number; pu: number; total: number }>;
}

export interface ChiffrageExportBundle {
  version: 3;
  exportedAt: string;
  overrides: OverridesStore;
  custom_postes: CustomPostesStore;
  form_overrides: FormOverridesStore;
}

export interface HeaderStats {
  usines: number;
  devis: number;
  postes: number;
}

export interface AutoFillRule {
  target: string;
  factor: number;
  label: string;
}

export interface AutoFillUpdate {
  target: string;
  value: number;
}

export interface ComputedFieldResult {
  value: number;
  hint?: string;
}

export interface ComputedFieldUpdate {
  fieldId: string;
  value: number;
  hint?: string;
}

export const EMPTY_CHARPENTE_EXT: CharpenteExtValues = {
  fermette_type: '',
  surface: 0,
  pvc20: 0,
  pvc25: 0,
  sabliere: 0,
  chev_s: 0,
  chev_esc: 0,
  chev_vlx: 0,
  rive: 0,
  devis_ext: 0,
};
