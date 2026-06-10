export type AuditStatus = 'draft' | 'validated' | 'archived';
export type AgencyTab = 'synthese' | 'audit' | 'equipe' | 'docs';
export type SynthView = 'mois' | 'annee' | 'glissant';
export type LeafKind = 'num' | 'multi' | 'qual' | 'text' | 'calc';

export interface AuditCommerceSettings {
  threshold: number;
  noteThreshold: number;
}

export interface AuditCommerceState {
  version: 2;
  agencies: Agency[];
  settings: AuditCommerceSettings;
}

export interface Agency {
  /** Canonical `agencies.id`. */
  id: number;
  name: string;
  address: string;
  employees: Employee[];
  objectives: AgencyObjectives;
  audits: Audit[];
  documents: DocMeta[];
}

export interface Employee {
  id: string;
  name: string;
  role: string;
}

export interface AgencyObjectives {
  signatures?: number;
  ccmi?: number;
  transfo?: number;
}

export interface DocMeta {
  id: string;
  name: string;
  kind: 'image' | 'excel';
  rows?: number;
  importedAt: string;
}

export interface Audit {
  id: string;
  date: string;
  status: AuditStatus;
  leaves: Record<string, LeafData>;
  empRatings: Record<string, EmpRating>;
  note?: number | string;
}

export interface EmpRating {
  comment?: string;
  note?: number;
}

export interface LeafRow {
  id: string;
  empId?: string;
  val?: number | string;
  note?: number | string;
  comment?: string;
  vals?: Record<string, number | string>;
}

export interface LeafData {
  rows?: LeafRow[];
  text?: string;
  note?: string;
}

export interface AuditTreeNode {
  id: string;
  label: string;
  kind?: LeafKind;
  hint?: string;
  kpi?: string;
  cols?: Array<{ key: string; label: string }>;
  children?: AuditTreeNode[];
}

export interface MonthKpis {
  contacts: number;
  signatures: number;
  ccmi: number;
  entrant: number;
  transfo: number;
}

export interface RatioValues {
  entrant: number;
  traite: number;
  rdv: number;
  r1: number;
  sign: number;
  resil: number;
  hs: number;
  r_traite: number | null;
  r_rdv: number | null;
  r_sign: number | null;
  r_sign_r1: number | null;
  r_resil: number | null;
  r_hs: number | null;
}

export interface NoteStats {
  emp: Record<string, { avg: number; count: number }>;
  agency: number | null;
  rated: number;
  points: number;
}

export interface DocPayload {
  type: 'image';
  dataURL?: string;
  storagePath?: string;
  storageBucket?: string;
}

export interface TableDocPayload {
  type: 'table';
  rows: unknown[][];
  sheet: string;
}

export type StoredDoc = DocPayload | TableDocPayload;

export interface BackupBundle {
  app: string;
  version: 2;
  exportedAt: string;
  data: AuditCommerceState;
  docs: Record<string, string>;
}
