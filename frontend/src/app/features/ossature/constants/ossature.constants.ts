export const DOCS_SIGNATURE = [
  { id: 'sig_bdc_appuis', label: 'BDC Appuis' },
  { id: 'sig_bdc_coffre', label: 'BDC Coffre' },
  { id: 'sig_plan_pc', label: 'Plan PC' },
  { id: 'sig_plan_mext', label: 'Plan MEXT' },
  { id: 'sig_fiche_mob', label: 'Fiche MOB' },
  { id: 'sig_commande_mext', label: 'Commande MEXT' },
  { id: 'sig_plan_pc_dwg', label: 'Plan PC DWG' },
  { id: 'sig_devis_charpente', label: 'Devis Charpente' },
] as const;

export const DOCS_REQUIS = [
  { id: 'bdc_appuis', label: 'BDC Appuis' },
  { id: 'bdc_coffre', label: 'BDC Coffre' },
  { id: 'plan_pc', label: 'Plan PC' },
  { id: 'plan_mext', label: 'Plan MEXT' },
  { id: 'fiche_mob', label: 'Fiche MOB' },
  { id: 'devis_mext', label: 'Devis MEXT' },
] as const;

export const STATUTS = [
  'Devis demandé',
  'Devis envoyé',
  'Commande confirmée',
  'Expédition validée',
] as const;

export type OssatureStatut = (typeof STATUTS)[number];

export const STATUT_STYLE: Record<string, { bg: string; color: string; dot: string }> = {
  'Devis demandé': { bg: '#FFF3CD', color: '#856404', dot: '#F59E0B' },
  'Devis envoyé': { bg: '#CCE5FF', color: '#004085', dot: '#3B82F6' },
  'Commande confirmée': { bg: '#D4EDDA', color: '#155724', dot: '#22C55E' },
  'Expédition validée': { bg: '#E2D9F3', color: '#4A235A', dot: '#8B5CF6' },
};

export const EXPEDITEUR = 'dtoulouse@maisonsnaturea.fr';
export const APP_URL = 'https://denisblokus-jpg.github.io/Command-mob/';

export type OssatureView = 'coord' | 'franchise' | 'usine' | 'archives';
