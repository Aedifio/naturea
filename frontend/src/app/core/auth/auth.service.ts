import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FACTORY_MANAGER_ROLE, FRANCHISEE_ROLE, isAdministratorRole } from '../constants/portal-roles.constants';
import { StorageKey } from '../models/storage-keys';
import { PortalPermissionsService } from '../services/portal-permissions.service';
import { AppDataBootstrapService } from '../services/app-data-bootstrap.service';
import {
  ActiveUser,
  AppCode,
  PermissionLevel,
  PortalUser,
} from '../models/user.model';
import { SupabaseStorageAdapter } from '../storage/supabase-storage.adapter';
import { StorageService } from '../storage/storage.service';
import { SupabaseService } from '../supabase/supabase.service';
import { syncSentryUser } from '../sentry/sentry-user';

interface PortalUserRow {
  legacy_id: number | null;
  name: string;
  role: string;
  actif: boolean;
  factory_id: number | null;
  agency_id: number | null;
  agencies: { name: string } | { name: string }[] | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  private readonly permissions = inject(PortalPermissionsService);
  private readonly dataBootstrap = inject(AppDataBootstrapService);
  private readonly storage = inject(StorageService);
  private readonly storageAdapter = inject(SupabaseStorageAdapter);
  private readonly router = inject(Router);

  private readonly userSignal = signal<PortalUser | null>(null);
  private readonly readySignal = signal(false);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly authReady = this.readySignal.asReadonly();

  /** Called from APP_INITIALIZER — restores session and hydrates KV cache. */
  async init(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      if (data.session) {
        await this.storageAdapter.hydrate();
        await this.loadProfileFromSession();
        try {
          await this.permissions.load();
          await this.dataBootstrap.loadAll();
        } catch (err) {
          console.error('[Auth] data load failed', err);
        }
      }
    } catch (err) {
      console.error('[Auth] init failed', err);
    } finally {
      this.readySignal.set(true);
    }

    this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await this.storageAdapter.hydrate();
        await this.loadProfileFromSession();
        try {
          await this.permissions.load();
          await this.dataBootstrap.loadAll();
        } catch (err) {
          console.error('[Auth] data load failed', err);
        }
      }
      if (event === 'SIGNED_OUT') {
        this.userSignal.set(null);
        syncSentryUser(null);
        this.storageAdapter.clearCache();
      }
    });
  }

  async login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      return { ok: false, error: 'Email ou mot de passe incorrect.' };
    }
    if (!data.session) {
      return { ok: false, error: 'Session non établie.' };
    }
    await this.storageAdapter.hydrate();
    const loaded = await this.loadProfileFromSession();
    if (!loaded) {
      await this.supabase.auth.signOut();
      return { ok: false, error: 'Profil portail introuvable pour ce compte.' };
    }
    try {
      await this.permissions.load();
      await this.dataBootstrap.loadAll();
    } catch (err) {
      console.error('[Auth] data load failed', err);
    }
    return { ok: true };
  }

  async logout(): Promise<void> {
    this.userSignal.set(null);
    syncSentryUser(null);
    this.storageAdapter.clearCache();
    await this.supabase.auth.signOut();
    void this.router.navigate(['/login']);
  }

  getPermission(appCode: AppCode): PermissionLevel {
    const user = this.userSignal();
    if (!user) return null;
    return this.permissions.getPermission(user.role, appCode);
  }

  canAccess(appCode: AppCode): boolean {
    return this.getPermission(appCode) !== null;
  }

  canReadApp(appCode: AppCode): boolean {
    if (this.canAccess(appCode)) return true;
    const user = this.userSignal();
    if (!user) return false;
    if (appCode === 'AUDIT' && ['Franchisé', 'Conducteur travaux'].includes(user.role)) return true;
    if (appCode === 'AUDIT_COM' && ['Franchisé', 'Commercial'].includes(user.role)) return true;
    return false;
  }

  isAnimateur(): boolean {
    return isAdministratorRole(this.userSignal()?.role);
  }

  /** Portal administrator (role Animateur). */
  isAdministrator(): boolean {
    return this.isAnimateur();
  }

  /** Canonical `factory.id` when the user is scoped to one usine in Ossature. */
  linkedFactoryId(): number | null {
    return this.userSignal()?.factoryId ?? null;
  }

  /** Canonical `agencies.id` when the user is a linked Franchisé. */
  linkedAgencyId(): number | null {
    return this.userSignal()?.agencyId ?? null;
  }

  /** Responsable d'usine — limited Ossature nav (usine + archives for linked factory). */
  isOssatureFactoryScoped(): boolean {
    if (this.isAnimateur()) return false;
    return this.userSignal()?.role === FACTORY_MANAGER_ROLE;
  }

  /** Franchisé linked to an agency — scoped views in Ossature and audits. */
  isAgencyScopedFranchisee(): boolean {
    if (this.isAnimateur()) return false;
    return this.userSignal()?.role === FRANCHISEE_ROLE && this.linkedAgencyId() != null;
  }

  /** @deprecated Prefer isAgencyScopedFranchisee — kept for Ossature call sites. */
  isOssatureAgencyScoped(): boolean {
    return this.isAgencyScopedFranchisee();
  }

  /** Refresh portal profile after admin edits the current user. */
  async reloadProfile(): Promise<void> {
    await this.loadProfileFromSession();
  }

  /** Resolves when session bootstrap completes (max 8s wait). */
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
      new Promise<void>((resolve) => setTimeout(resolve, 8000)),
    ]);
  }

  private async loadProfileFromSession(): Promise<boolean> {
    const { data: authData } = await this.supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser?.id || !authUser.email) return false;

    const { data: row, error } = await this.supabase
      .from('portal_users')
      .select('legacy_id, name, role, actif, factory_id, agency_id, agencies(name)')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (error || !row || !row.actif) return false;

    const user = this.mapPortalUser(row as PortalUserRow, authUser.email);
    this.userSignal.set(user);
    syncSentryUser(user);
    this.syncActiveUser(user);
    return true;
  }

  private mapPortalUser(row: PortalUserRow, email: string): PortalUser {
    const agency = Array.isArray(row.agencies) ? row.agencies[0] : row.agencies;
    const agencyName = agency?.name?.trim();
    return {
      id: row.legacy_id ?? 0,
      email,
      name: row.name,
      role: row.role as PortalUser['role'],
      agencyId: row.agency_id ?? null,
      franchise: agencyName || '(siège)',
      actif: row.actif,
      factoryId: row.factory_id ?? null,
    };
  }

  private syncActiveUser(user: PortalUser): void {
    const active: ActiveUser = {
      name: user.name,
      role: user.role,
      franchise: user.franchise,
      email: user.email,
    };
    this.storage.set(StorageKey.ActiveUser, active);
  }
}
