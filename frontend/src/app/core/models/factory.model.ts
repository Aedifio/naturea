/** Canonical usine metadata (Supabase `factory` table). Postes stay in REFS for now. */
export interface Factory {
  id: number;
  key: string;
  nom: string;
  couleur: string;
  description: string | null;
  address: string | null;
  contact_email: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface FactoryCreate {
  key: string;
  nom: string;
  couleur: string;
  description: string;
  address: string;
  contact_email: string;
  actif: boolean;
}

export interface FactoryUpdate {
  nom: string;
  couleur: string;
  description: string;
  address: string;
  contact_email: string;
  actif: boolean;
}

/** Ossature site label (uppercase) → factory key (lowercase). */
export const OSSATURE_SITE_TO_FACTORY_KEY: Record<string, string> = {
  IMAJ: 'imaj',
  SAVARE: 'savare',
  BOISBOREAL: 'boisboreal',
  COBS: 'cobs',
  SICOB: 'sicob',
  LOWALL: 'lowall',
};

/** Factory key → Ossature site label stored on orders. */
export function factoryKeyToOssatureSite(key: string): string {
  for (const [site, factoryKey] of Object.entries(OSSATURE_SITE_TO_FACTORY_KEY)) {
    if (factoryKey === key) return site;
  }
  return key.toUpperCase();
}

export function ossatureSiteToFactoryKey(site: string): string {
  return OSSATURE_SITE_TO_FACTORY_KEY[site] ?? site.toLowerCase();
}
