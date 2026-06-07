export const SITES = ['IMAJ', 'SAVARE', 'BOISBOREAL', 'COBS', 'SICOB', 'LOWALL', 'USINE TEST'] as const;

export const SITES_ADRESSES: Record<string, string> = {
  IMAJ: '48 Rue du Chêne Vert, 47200 Marmande (47)',
  SAVARE: 'Rue Saint-Pierre sur Dives, 14370 Moult-Chicheboville (14)',
  BOISBOREAL: '8 Rue Joseph Monnier, Pôle Odyssée, 85220 Coëx (85)',
  COBS: "ZI Sud Route d'Orly, 74310 Albens (74)",
  SICOB: 'Zone Artisanale, 12240 Rieupeyroux (12)',
  LOWALL: 'Pôle Yvon Morandat, 13120 Gardanne (13)',
  'USINE TEST': 'Adresse test — à compléter',
};

export const FRANCHISES = [
  'TARN MAISON OSSATURE BOIS',
  'GP-MEOB',
  'SARL LBROS',
  'ECOHOME 84',
  'BUGEY BRESSE CONSTRUCTIONS',
  'ACVR HOME',
  'LDPCA CONSTRUCTIONS',
  'E.M.A CONSTRUCTION',
  'MGCE',
  'CABINET APJ',
  'SAS BERTRAND CONSTRUCTIONS',
  'OB CONCEPT',
  'EVABOIS',
  'NATI BRETAGNE NORD',
  'NOGOT CONCEPT',
  'MO2B MAISONS A OSSATURE BOIS ET BRIQUE',
  'BOISILIA CONSTRUCTION',
  'AGENCE TEST',
] as const;

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

export const SITES_EMAILS: Record<string, string> = {
  IMAJ: 'jernout@imaj-bois.fr',
  SAVARE: 'contact@savare.fr',
  BOISBOREAL: 'contact@boisboreal.fr',
  COBS: 'contact@cobs.fr',
  SICOB: 'contact@sicob.fr',
  LOWALL: 'contact@lowall.fr',
  'USINE TEST': 'denis.blokus@gmail.com',
};

export const FRANCHISES_EMAILS: Record<string, string> = {
  'TARN MAISON OSSATURE BOIS': 'contact@tarn-mob.fr',
  'GP-MEOB': 'contact@gp-meob.fr',
  'SARL LBROS': 'contact@lbros.fr',
  'ECOHOME 84': 'contact@ecohome84.fr',
  'BUGEY BRESSE CONSTRUCTIONS': 'contact@bugey-bresse.fr',
  'ACVR HOME': 'contact@acvr-home.fr',
  'LDPCA CONSTRUCTIONS': 'contact@ldpca.fr',
  'E.M.A CONSTRUCTION': 'contact@ema-construction.fr',
  MGCE: 'contact@mgce.fr',
  'CABINET APJ': 'contact@cabinet-apj.fr',
  'SAS BERTRAND CONSTRUCTIONS': 'contact@bertrand-constructions.fr',
  'OB CONCEPT': 'contact@ob-concept.fr',
  EVABOIS: 'contact@evabois.fr',
  'NATI BRETAGNE NORD': 'contact@nati-bretagne.fr',
  'NOGOT CONCEPT': 'contact@nogot-concept.fr',
  'MO2B MAISONS A OSSATURE BOIS ET BRIQUE': 'contact@mo2b.fr',
  'BOISILIA CONSTRUCTION': 'contact@boisilia.fr',
  'AGENCE TEST': 'denis.blokus@gmail.com',
};

export const EXPEDITEUR = 'dtoulouse@maisonsnaturea.fr';
export const APP_URL = 'https://denisblokus-jpg.github.io/Command-mob/';

export type OssatureView = 'coord' | 'franchise' | 'usine' | 'archives';
