import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface PortalUserRow {
  id: string;
  legacy_id: number | null;
  auth_user_id: string | null;
  email: string | null;
  name: string;
  role: string;
  franchise: string;
  actif: boolean;
}

export interface PortalUserUpdate {
  email: string;
  name: string;
  role: string;
  franchise: string;
  actif: boolean;
  /** Optional new password. Empty/undefined leaves the current password unchanged. */
  password?: string;
}

export interface PortalUserCreate extends PortalUserUpdate {
  password: string;
}

@Injectable({ providedIn: 'root' })
export class PortalUsersService {
  private readonly supabase = inject(SupabaseService);

  async list(): Promise<PortalUserRow[]> {
    const { data, error } = await this.supabase.rpc('list_portal_users_admin');
    if (error) throw error;
    return (data ?? []) as PortalUserRow[];
  }

  async create(input: PortalUserCreate): Promise<PortalUserRow> {
    const { data: portalId, error } = await this.supabase.rpc('admin_create_portal_user', {
      p_email: input.email.trim(),
      p_password: input.password,
      p_name: input.name.trim(),
      p_role: input.role,
      p_franchise: input.franchise.trim(),
      p_actif: input.actif,
    });
    if (error) throw error;

    const rows = await this.list();
    const created = rows.find((u) => u.id === portalId);
    if (!created) throw new Error('User not found after create');
    return created;
  }

  async update(id: string, patch: PortalUserUpdate): Promise<PortalUserRow> {
    const { error } = await this.supabase.rpc('admin_update_portal_user', {
      p_portal_user_id: id,
      p_email: patch.email.trim(),
      p_name: patch.name.trim(),
      p_role: patch.role,
      p_franchise: patch.franchise.trim(),
      p_actif: patch.actif,
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
