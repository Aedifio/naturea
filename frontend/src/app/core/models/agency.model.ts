/** Canonical franchise / agency (Supabase `agencies` table). */
export interface Agency {
  id: number;
  name: string;
  ville: string | null;
  adresse: string | null;
  slug: string | null;
  contact_email: string | null;
  created_at: string;
  updated_at: string;
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
}
