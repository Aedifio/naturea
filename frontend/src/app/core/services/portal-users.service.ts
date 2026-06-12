import { Injectable, inject } from '@angular/core';
import { PermissionLevel } from '../models/user.model';
import { SupabaseService } from '../supabase/supabase.service';

export interface CodirTeamMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  codirPermission: PermissionLevel;
  agencyNom: string | null;
  factoryNom: string | null;
}

export interface PortalUserRow {
  id: string;
  legacy_id: number | null;
  auth_user_id: string | null;
  email: string | null;
  name: string;
  role_id: string;
  role: string;
  actif: boolean;
  agency_id: number | null;
  agency_nom: string | null;
  factory_id: number | null;
  factory_nom: string | null;
}

/** Admin list row: portal profile + auth.users.last_sign_in_at (not stored on portal_users). */
export interface PortalUserAdminRow extends PortalUserRow {
  last_sign_in_at: string | null;
}

export interface PortalUserUpdate {
  email: string;
  name: string;
  role_id: string;
  actif: boolean;
  agency_id: number | null;
  factory_id: number | null;
  /** Optional new password. Empty/undefined leaves the current password unchanged. */
  password?: string;
}

export interface PortalUserCreate extends PortalUserUpdate {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class PortalUsersService {
  private readonly supabase = inject(SupabaseService);

  async list(): Promise<PortalUserAdminRow[]> {
    const { data, error } = await this.supabase.rpc('list_portal_users_admin');
    if (error) throw error;
    return (data ?? []) as PortalUserAdminRow[];
  }

  async listCodirTeam(): Promise<CodirTeamMember[]> {
    const { data, error } = await this.supabase.rpc('list_codir_team');
    if (error) throw error;
    return ((data ?? []) as Array<{
      id: string;
      name: string;
      email: string | null;
      role: string;
      codir_permission: string;
      agency_nom: string | null;
      factory_nom: string | null;
    }>).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      codirPermission: row.codir_permission as PermissionLevel,
      agencyNom: row.agency_nom,
      factoryNom: row.factory_nom,
    }));
  }

  async create(input: PortalUserCreate): Promise<PortalUserAdminRow> {
    const { data: portalId, error } = await this.supabase.rpc('admin_create_portal_user', {
      p_email: input.email.trim(),
      p_password: input.password,
      p_name: input.name.trim(),
      p_role_id: input.role_id,
      p_actif: input.actif,
      p_agency_id: input.agency_id,
      p_factory_id: input.factory_id,
    });
    if (error) throw error;

    const rows = await this.list();
    const created = rows.find((u) => u.id === portalId);
    if (!created) throw new Error('User not found after create');
    return created;
  }

  async update(id: string, patch: PortalUserUpdate): Promise<PortalUserAdminRow> {
    const { error } = await this.supabase.rpc('admin_update_portal_user', {
      p_portal_user_id: id,
      p_email: patch.email.trim(),
      p_name: patch.name.trim(),
      p_role_id: patch.role_id,
      p_actif: patch.actif,
      p_agency_id: patch.agency_id,
      p_factory_id: patch.factory_id,
    });
    if (error) throw error;

    const rows = await this.list();
    const updated = rows.find((u) => u.id === id);
    if (!updated) throw new Error('User not found after update');
    return updated;
  }

  async setPassword(id: string, password: string): Promise<void> {
    const { error } = await this.supabase.rpc('admin_set_portal_user_password', {
      p_portal_user_id: id,
      p_password: password,
    });
    if (error) throw error;
  }
}
