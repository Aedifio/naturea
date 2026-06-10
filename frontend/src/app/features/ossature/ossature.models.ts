import { OssatureStatut } from './constants/ossature.constants';

export interface PlanValDoc {
  name: string;
  date: string;
}

export interface OssatureOrder {
  id: string;
  franchise: string;
  reference: string;
  surface: string;
  plancher?: string;
  site: string;
  statut: OssatureStatut | string;
  livraison: string;
  permis?: string;
  docs: string[];
  docs_date?: string;
  created: string;
  annee: number;
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
  'franchise' | 'reference' | 'surface' | 'plancher' | 'site' | 'livraison' | 'permis' | 'docs'
>;

export type SignatureMode = 'devis' | 'plan_val';
