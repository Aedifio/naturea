import { Injectable, computed, signal } from '@angular/core';
import { Router } from '@angular/router';
import { PERMS, SEED_USERS } from '../models/permissions.model';
import { StorageKey } from '../models/storage-keys';
import {
  ActiveUser,
  AppCode,
  AuthSession,
  PermissionLevel,
  PortalUser,
} from '../models/user.model';
import { StorageService } from '../storage/storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly userSignal = signal<PortalUser | null>(null);

  readonly currentUser = this.userSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);

  constructor(
    private readonly storage: StorageService,
    private readonly router: Router,
  ) {
    this.restoreSession();
  }

  login(email: string, password: string): { ok: boolean; error?: string } {
    const user = SEED_USERS.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!user) {
      return { ok: false, error: 'Email ou mot de passe incorrect.' };
    }
    if (!user.actif) {
      return { ok: false, error: 'Ce compte est désactivé.' };
    }
    this.setSession(user);
    return { ok: true };
  }

  logout(): void {
    this.userSignal.set(null);
    this.storage.remove(StorageKey.AuthSession);
    this.storage.remove(StorageKey.ActiveUser);
    void this.router.navigate(['/login']);
  }

  getPermission(appCode: AppCode): PermissionLevel {
    const user = this.userSignal();
    if (!user) return null;
    const rolePerms = PERMS[user.role];
    if (!rolePerms) return null;
    return rolePerms[appCode] ?? null;
  }

  canAccess(appCode: AppCode): boolean {
    return this.getPermission(appCode) !== null;
  }

  /** Read-only access from role dashboard (audits) even when nav permission is null. */
  canReadApp(appCode: AppCode): boolean {
    if (this.canAccess(appCode)) return true;
    const user = this.userSignal();
    if (!user) return false;
    if (appCode === 'AUDIT' && ['Franchisé', 'Conducteur travaux'].includes(user.role)) return true;
    if (appCode === 'AUDIT_COM' && ['Franchisé', 'Commercial'].includes(user.role)) return true;
    return false;
  }

  isAnimateur(): boolean {
    return this.userSignal()?.role === 'Animateur';
  }

  /** Writes naturea_active_user for legacy app contract (Chiffrage reads this). */
  private syncActiveUser(user: PortalUser): void {
    const active: ActiveUser = {
      name: user.name,
      role: user.role,
      franchise: user.franchise,
      email: user.email,
    };
    this.storage.set(StorageKey.ActiveUser, active);
  }

  private setSession(user: PortalUser): void {
    this.userSignal.set(user);
    const session: AuthSession = { userId: user.id, email: user.email };
    this.storage.set(StorageKey.AuthSession, session);
    this.syncActiveUser(user);
  }

  private restoreSession(): void {
    const session = this.storage.get<AuthSession>(StorageKey.AuthSession);
    if (!session) return;
    const user = SEED_USERS.find((u) => u.id === session.userId && u.actif);
    if (user) {
      this.userSignal.set(user);
      this.syncActiveUser(user);
    }
  }
}
