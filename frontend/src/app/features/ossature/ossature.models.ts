import { OssatureStatut } from './constants/ossature.constants';

export interface PlanValDoc {
  name: string;
  date: string;
}

export interface OssatureOrder {
  id: string;
  agencyId: number;
  factoryId: number;
  /** Resolved from `agencies` join — display only. */
  agencyName?: string;
  /** Ossature site label (IMAJ, SAVARE, …) — resolved from `factory` join. */
  factorySite?: string;
  reference: string;
  /** Wall surface in m². */
  surface: number;
  /** Floor surface in m². */
  plancher?: number | null;
  statut: OssatureStatut | string;
  deliveryDate: string;
  permis?: string | null;
  docs: string[];
  docs_date?: string;
  created: string;
  archived?: boolean;
  archived_date?: string;
  devis_retour?: string;
  devis_retour_date?: string;
  devis_retour_heure?: string;
  signature?: string;
  signature_date?: string;
  signature_heure?: string;
  signature_docs?: string[];
  docs_recus_date?: string;
  docs_recus_heure?: string;
  ar_fichier?: string;
  ar_date?: string;
  ar_heure?: string;
  ar_livraison_chantier?: string;
  plan_fab?: string;
  plan_fab_date?: string;
  plan_val_signature?: string;
  plan_val_date?: string;
  plan_val_heure?: string;
  plan_val_docs?: PlanValDoc[];
  livraison_definitive?: string;
  statut_secondaire?: string | null;
}

export type NewOrderInput = Pick<
  OssatureOrder,
  'agencyId' | 'factoryId' | 'reference' | 'surface' | 'plancher' | 'deliveryDate' | 'permis'
>;

export type OssatureOrderFileKind =
  | 'doc_requis'
  | 'devis_retour'
  | 'signature'
  | 'ar'
  | 'plan_fab'
  | 'plan_val';

export interface OssatureOrderFileRef {
  kind: OssatureOrderFileKind;
  slot: string;
  portalFileId: string;
  filename: string;
  path: string;
}

export type SignatureMode = 'devis' | 'plan_val';
