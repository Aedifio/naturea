export type EcartType = 'urgent' | 'mineur' | 'corrige' | 'conseil' | 'nvu';
export type RectifStatus = 'en_attente' | 'en_cours' | 'corrige' | 'reporte';

export interface CorpsMetier {
  id: number;
  code: string;
  label: string;
  note: number | null;
  ecart: EcartType | null;
  commentaire: string;
  photos: string[];
  rectifStatus: RectifStatus;
  rectifNote: string;
}

export interface Audit {
  id: number;
  date: string;
  auditeur: string;
  chantiers: string;
  participants: string;
  commentaires: string;
  corps: CorpsMetier[];
}

export interface Agence {
  id: number;
  nom: string;
  ville: string;
  adresse: string;
  audits: Audit[];
}

export interface AuditTechniqueState {
  agences: Agence[];
}

export interface UrgentEcart {
  agenceId: number;
  agenceNom: string;
  agenceVille: string;
  auditId: number;
  auditDate: string;
  corpsId: number;
  corpsCode: string;
  corpsLabel: string;
  commentaire: string;
  rectifStatus: RectifStatus;
  rectifNote: string;
  photos: string[];
}

export interface CorpsAvg {
  id: number;
  code: string;
  label: string;
  avg: number;
}

export interface NewAuditDraft {
  id: number;
  date: string;
  auditeur: string;
  chantiers: string;
  participants: string;
  commentaires: string;
  corps: CorpsMetier[];
}
