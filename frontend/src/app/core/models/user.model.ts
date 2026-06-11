export type AppCode =
  | 'RESEAU'
  | 'CODIR'
  | 'RECRUT'
  | 'OSSATURE'
  | 'AUDIT'
  | 'AUDIT_COM'
  | 'CHIFFRAGE'
  | 'ADMIN';

export type PermissionLevel = 'R' | 'RW' | 'ADMIN' | null;

export interface PortalUser {
  /** Supabase `portal_users.id` (UUID). */
  portalUserId: string;
  id: number;
  email: string;
  /** Legacy seed field — not used at runtime with Supabase Auth. */
  password?: string;
  name: string;
  role: string;
  /** Canonical agencies.id when the user is a Franchisé. */
  agencyId: number | null;
  /** Display label: agency name, or « (siège) » when no agency is linked. */
  franchise: string;
  actif: boolean;
  /** When set (and user is not Animateur), Ossature usine/archives are scoped to this factory. */
  factoryId: number | null;
  /** Linked recrutement candidature when role is Candidat franchise. */
  recrutementCandidatId: string | null;
}

export interface ActiveUser {
  name: string;
  role: string;
  franchise: string;
  email: string;
}

export interface AuthSession {
  userId: number;
  email: string;
}

export interface AppMeta {
  code: AppCode;
  name: string;
  icon: string;
  className: string;
  desc: string;
  route: string;
  kpiPublic?: boolean;
}
