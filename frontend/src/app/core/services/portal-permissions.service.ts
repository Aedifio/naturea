import { Injectable, inject, signal } from '@angular/core';
import { RolePermissions } from '../models/permissions.model';
import { AppCode, PermissionLevel } from '../models/user.model';
import { SupabaseService } from '../supabase/supabase.service';

export interface PortalRole {
  id: string;
  name: string;
}

export interface RolePermissionRow {
  role_id: string;
  role: string;
  app_slot: string;
  permission: string;
}

@Injectable({ providedIn: 'root' })
export class PortalPermissionsService {
  private readonly supabase = inject(SupabaseService);
  private readonly matrixSignal = signal<Record<string, RolePermissions>>({});
  private readonly readySignal = signal(false);

  readonly matrix = this.matrixSignal.asReadonly();
  readonly ready = this.readySignal.asReadonly();
  readonly knownRoles = signal<string[]>([]);
  readonly portalRoles = signal<PortalRole[]>([]);

  async loadPortalRoles(): Promise<PortalRole[]> {
    const { data, error } = await this.supabase.rpc('list_portal_roles');
    if (error) throw error;
    const roles = (data ?? []) as PortalRole[];
    this.portalRoles.set(roles);
    return roles;
  }

  async load(): Promise<RolePermissionRow[]> {
    const { data: sessionData } = await this.supabase.auth.getSession();
    if (!sessionData.session) {
      this.readySignal.set(true);
      return [];
    }

    await this.loadPortalRoles();
    const { data, error } = await this.supabase.rpc('list_role_permissions');

    if (error) {
      console.error('[PortalPermissions] load failed', error);
      this.readySignal.set(true);
      throw error;
    }

    const rows = (data ?? []) as RolePermissionRow[];
    this.applyRows(rows);
    return rows;
  }

  whenReady(): Promise<void> {
    if (this.readySignal()) return Promise.resolve();
    return Promise.race([
      new Promise<void>((resolve) => {
        const id = setInterval(() => {
          if (this.readySignal()) {
            clearInterval(id);
            resolve();
          }
        }, 10);
      }),
      new Promise<void>((resolve) => {
        setTimeout(() => {
          if (!this.readySignal()) {
            console.warn('[PortalPermissions] whenReady timeout — continuing without matrix');
            this.readySignal.set(true);
          }
          resolve();
        }, 8000);
      }),
    ]);
  }

  async loadForAdmin(): Promise<RolePermissionRow[]> {
    await this.loadPortalRoles();
    try {
      const { data, error } = await this.supabase.rpc('list_role_permissions_admin');
      if (!error && data?.length) {
        const rows = data as RolePermissionRow[];
        this.applyRows(rows);
        return rows;
      }
    } catch {
      // fall through to standard load
    }
    return this.load();
  }

  async saveRole(roleId: string, permissions: RolePermissions, reload = true): Promise<void> {
    const payload: Record<string, string> = {};
    for (const [app, level] of Object.entries(permissions)) {
      if (level) payload[app] = level;
    }
    const { error } = await this.supabase.rpc('admin_save_role_permissions', {
      p_role_id: roleId,
      p_permissions: payload,
    });
    if (error) throw error;
    if (reload) await this.load();
  }

  getPermission(roleId: string, appCode: AppCode): PermissionLevel {
    return this.matrixSignal()[roleId]?.[appCode] ?? null;
  }

  getRoles(): string[] {
    return this.knownRoles();
  }

  rowsToMatrix(rows: RolePermissionRow[]): Record<string, RolePermissions> {
    const matrix: Record<string, RolePermissions> = {};
    for (const row of rows) {
      if (!row?.role_id || !row?.app_slot || !row?.permission) continue;
      if (!matrix[row.role_id]) matrix[row.role_id] = {};
      matrix[row.role_id][row.app_slot as AppCode] = row.permission as PermissionLevel;
    }
    return matrix;
  }

  roleNameById(roleId: string): string {
    return this.portalRoles().find((r) => r.id === roleId)?.name ?? '';
  }

  applyRows(rows: RolePermissionRow[]): void {
    const matrix = this.rowsToMatrix(rows);
    this.matrixSignal.set(matrix);
    const fromRows = new Map<string, string>();
    for (const row of rows) {
      if (row.role_id && row.role) fromRows.set(row.role_id, row.role);
    }
    for (const role of this.portalRoles()) {
      fromRows.set(role.id, role.name);
    }
    const entries = [...fromRows.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    this.portalRoles.set(entries);
    this.knownRoles.set(entries.map((e) => e.name));
    this.readySignal.set(true);
  }

  private matrixToRows(): RolePermissionRow[] {
    const rows: RolePermissionRow[] = [];
    for (const [roleId, perms] of Object.entries(this.matrixSignal())) {
      const role = this.roleNameById(roleId);
      for (const [app_slot, permission] of Object.entries(perms)) {
        if (permission) rows.push({ role_id: roleId, role, app_slot, permission });
      }
    }
    return rows;
  }
}
