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
  id: number;
  email: string;
  /** Legacy seed field — not used at runtime with Supabase Auth. */
  password?: string;
  name: string;
  role: string;
  franchise: string;
  actif: boolean;
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
