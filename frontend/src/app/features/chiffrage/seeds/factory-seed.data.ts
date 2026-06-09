import type { FactorySeed } from '../../../core/models/factory.model';

/**
 * Canonical factory metadata — used by Supabase migration seed.
 * Postes / devis_count remain in chiffrage-refs.constants.ts.
 */
export const FACTORY_SEED: FactorySeed[] = [
  {
    key: 'boisboreal',
    nom: 'BoisBoréal',
    couleur: '#2B4A1A',
    description: 'Fabricant Vendée — agences Ouest et Sud',
    contact_email: 'contact@boisboreal.fr',
    legacy_updated_at: '2026-04-29',
  },
  {
    key: 'cobs',
    nom: 'COBS / GIPEN',
    couleur: '#5A7A3A',
    description: 'Fabricant Savoie — agences Est et Sud-Est',
    contact_email: 'contact@cobs.fr',
    legacy_updated_at: '2026-03-06',
  },
  {
    key: 'sicob',
    nom: 'SICOB',
    couleur: '#8B4513',
    description: 'Charpentier-couvreur Aveyron (12240 Rieupeyroux) — agences Midi-Pyrénées, Occitanie, PACA',
    contact_email: 'contact@sicob.fr',
    legacy_updated_at: '2026-04-17',
  },
  {
    key: 'imaj',
    nom: 'IMAJ',
    couleur: '#1A5276',
    description: 'Fabricant MOB Lot-et-Garonne (47200 Marmande) — agences Sud-Ouest',
    contact_email: 'jernout@imaj-bois.fr',
    legacy_updated_at: '2026-03-04',
  },
  {
    key: 'savare',
    nom: 'SAVARE (Eiffage)',
    couleur: '#C0392B',
    description: 'Fabricant MOB Normandie (Lessay 50 / Moult 14) — agences Normandie, Grand Ouest, Nord',
    contact_email: 'contact@savare.fr',
    legacy_updated_at: '2025-04-08',
  },
  {
    key: 'lowall',
    nom: 'LOWALL',
    couleur: '#2E7D7D',
    description: 'Fabricant panneaux MOB Bouches-du-Rhône (Gardanne 13) — agences PACA. Pas de charpente.',
    contact_email: 'contact@lowall.fr',
    legacy_updated_at: '2026-05-11',
  },
];
