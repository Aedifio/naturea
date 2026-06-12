/** Canonical franchise / agency (Supabase `agencies` table). */
export interface Agency {
  id: number;
  name: string;
  ville: string | null;
  adresse: string | null;
  slug: string | null;
  contact_email: string | null;
  actif: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export type AgencyStatus = 'active' | 'disabled' | 'archived';

export function agencyStatus(a: Pick<Agency, 'actif' | 'archived'>): AgencyStatus {
  if (a.archived) return 'archived';
  if (!a.actif) return 'disabled';
  return 'active';
}

export function agencyStatusLabel(status: AgencyStatus): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'disabled':
      return 'Désactivée';
    case 'archived':
      return 'Archivée';
  }
}

export interface AgencyCreate {
  name: string;
  ville: string;
  adresse: string;
  contact_email: string;
}

export interface AgencyUpdate {
  name: string;
  ville: string;
  adresse: string;
  contact_email: string;
  status: AgencyStatus;
}
