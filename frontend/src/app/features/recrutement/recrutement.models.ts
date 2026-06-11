export interface StoredDocument {
  name: string;
  dataUrl: string | null;
  type: string;
  storagePath?: string;
  storageBucket?: string;
}

export interface DiscResult {
  scores: { D: number; I: number; S: number; C: number };
  dominant: 'D' | 'I' | 'S' | 'C';
  date: string;
}

export interface QuestionnaireData {
  date?: string;
  [key: string]: string | undefined;
}

export interface Candidate {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  password?: string;
  hasPortalAccount?: boolean;
  portalUserId?: string | null;
  tel?: string;
  ville?: string;
  cp?: string;
  budget?: string;
  zone?: string;
  source?: string;
  statut: string;
  stars: number;
  dateCandidature: string;
  archived?: boolean;
  archivedAt?: string;
  notes?: string;
  documents: Record<string, StoredDocument>;
  disc: DiscResult | null;
  questionnaire: QuestionnaireData | null;
}

export interface RecrutAdminSession {
  role: 'admin';
  email: string;
  name: string;
}

export interface RecrutCandidateSession {
  role: 'candidate';
  email: string;
  name: string;
  id: string;
}

export type RecrutSession = RecrutAdminSession | RecrutCandidateSession;

export const CANDIDATE_STATUSES = [
  'Nouveau',
  'Contact établi',
  'RDV planifié',
  'Qualifié',
  'Recrutement en cours',
  'Refusé',
] as const;

export const CANDIDATE_SOURCES = [
  'LinkedIn',
  'Instagram',
  'Facebook',
  'Salon franchise',
  'Site web',
  'Bouche à oreille',
  'Presse',
  'Autre',
] as const;
