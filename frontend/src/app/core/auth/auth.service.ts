import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PORTAL_APP_LANDING_ORDER, routeForAppCode } from '../constants/portal-landing.constants';
import { FACTORY_MANAGER_ROLE, FRANCHISEE_ROLE, isAdministratorRole, isCandidateFranchiseRole } from '../constants/portal-roles.constants';
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
  id: string;
  legacy_id: number | null;
  name: string;
  role_id: string;
  portal_roles: { name: string } | { name: string }[] | null;
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
  private lastAccountCheckAt = 0;
  private accountCheckInFlight: Promise<void> | null = null;
  private static readonly ACCOUNT_CHECK_MIN_MS = 2000;

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly authReady = this.readySignal.asReadonly();

  /** Called from APP_INITIALIZER — restores session and hydrates KV cache. */
  async init(): Promise<void> {
    try {
      const { data } = await this.supabase.auth.getSession();
      if (data.session) {
        await this.storageAdapter.hydrate();
        const loaded = await this.loadProfileFromSession();
        if (!loaded) {
          await this.supabase.auth.signOut();
        }
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
    const profileStatus = await this.resolveProfileStatus();
    if (profileStatus === 'inactive') {
      await this.supabase.auth.signOut();
      return { ok: false, error: 'Votre compte a été désactivé.' };
    }
    if (profileStatus !== 'ok') {
      await this.supabase.auth.signOut();
      return { ok: false, error: 'Profil portail introuvable pour ce compte.' };
    }
    await this.loadProfileFromSession();
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

  /** Re-validates portal account; logs out if the user was deactivated while connected. */
  async ensureAccountActive(): Promise<void> {
    if (!this.userSignal()) return;

    const now = Date.now();
    if (now - this.lastAccountCheckAt < AuthService.ACCOUNT_CHECK_MIN_MS) {
      return;
    }

    if (this.accountCheckInFlight) {
      await this.accountCheckInFlight;
      return;
    }

    this.accountCheckInFlight = this.runAccountCheck();
    try {
      await this.accountCheckInFlight;
    } finally {
      this.accountCheckInFlight = null;
    }
  }

  async logoutDueToBlockedAccount(): Promise<void> {
    this.userSignal.set(null);
    syncSentryUser(null);
    this.storageAdapter.clearCache();
    await this.supabase.auth.signOut();
    void this.router.navigate(['/login'], { queryParams: { reason: 'blocked' } });
  }

  getPermission(appCode: AppCode): PermissionLevel {
    const user = this.userSignal();
    if (!user) return null;
    return this.permissions.getPermission(user.roleId, appCode);
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

  /** Candidat franchise — recrutement app only, scoped to own candidature. */
  isRecrutementCandidate(): boolean {
    return isCandidateFranchiseRole(this.userSignal()?.role);
  }

  linkedRecrutementCandidatId(): string | null {
    return this.userSignal()?.recrutementCandidatId ?? null;
  }

  canAccessPortail(): boolean {
    return this.canAccess('PORTAIL');
  }

  /** First app route the user can open (agency-scoped when relevant). */
  firstAccessibleAppRoute(): string {
    const agencyId = this.isAgencyScopedFranchisee() ? this.linkedAgencyId() : null;
    const isCandidate = this.isRecrutementCandidate();
    for (const code of PORTAL_APP_LANDING_ORDER) {
      if (!this.canReadApp(code)) continue;
      return routeForAppCode(code, agencyId, isCandidate);
    }

    return '/login';
  }

  /** Default post-login route based on role permissions. */
  defaultRouteAfterLogin(): string {
    if (this.canAccessPortail()) {
      return '/home';
    }
    return this.firstAccessibleAppRoute();
  }

  /** @deprecated Prefer isAgencyScopedFranchisee — kept for Ossature call sites. */
  isOssatureAgencyScoped(): boolean {
    return this.isAgencyScopedFranchisee();
  }

  /** Canonical `portal_users.id` for the signed-in user. */
  portalUserId(): string | null {
    return this.userSignal()?.portalUserId ?? null;
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

  private async runAccountCheck(): Promise<void> {
    this.lastAccountCheckAt = Date.now();
    const status = await this.resolveProfileStatus();
    if (status === 'inactive') {
      await this.logoutDueToBlockedAccount();
      return;
    }
    if (status === 'missing') {
      await this.logout();
    }
  }

  private async resolveProfileStatus(): Promise<'ok' | 'inactive' | 'missing'> {
    const { data: authData } = await this.supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser?.id || !authUser.email) return 'missing';

    const { data: row, error } = await this.supabase.client
      .from('portal_users')
      .select('id, actif')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (error || !row) return 'missing';
    if (!row.actif) return 'inactive';
    return 'ok';
  }

  private async loadProfileFromSession(): Promise<boolean> {
    const { data: authData } = await this.supabase.auth.getUser();
    const authUser = authData.user;
    if (!authUser?.id || !authUser.email) return false;

    const { data: row, error } = await this.supabase.client
      .from('portal_users')
      .select('id, legacy_id, name, role_id, actif, factory_id, agency_id, agencies(name), portal_roles(name)')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();

    if (error || !row || !row.actif) return false;

    const roleName = this.portalRoleName(row as PortalUserRow);
    let recrutementCandidatId: string | null = null;
    if (isCandidateFranchiseRole(roleName)) {
      const { data: candidatRow } = await this.supabase.client
        .from('recrutement_candidats')
        .select('id')
        .eq('portal_user_id', row.id)
        .maybeSingle();
      recrutementCandidatId = candidatRow?.id ?? null;
    }

    const user = this.mapPortalUser(row as PortalUserRow, authUser.email, recrutementCandidatId);
    this.userSignal.set(user);
    syncSentryUser(user);
    this.syncActiveUser(user);
    return true;
  }

  private portalRoleName(row: PortalUserRow): string {
    const role = Array.isArray(row.portal_roles) ? row.portal_roles[0] : row.portal_roles;
    return role?.name ?? '';
  }

  private mapPortalUser(row: PortalUserRow, email: string, recrutementCandidatId: string | null = null): PortalUser {
    const agency = Array.isArray(row.agencies) ? row.agencies[0] : row.agencies;
    const agencyName = agency?.name?.trim();
    const roleName = this.portalRoleName(row);
    return {
      portalUserId: row.id,
      id: row.legacy_id ?? 0,
      email,
      name: row.name,
      roleId: row.role_id,
      role: roleName,
      agencyId: row.agency_id ?? null,
      franchise: agencyName || '(siège)',
      actif: row.actif,
      factoryId: row.factory_id ?? null,
      recrutementCandidatId,
    };
  }

  private syncActiveUser(user: PortalUser): void {
    const active: ActiveUser = {
      name: user.name,
      roleId: user.roleId,
      role: user.role,
      franchise: user.franchise,
      email: user.email,
    };
    this.storage.set(StorageKey.ActiveUser, active);
  }
}
