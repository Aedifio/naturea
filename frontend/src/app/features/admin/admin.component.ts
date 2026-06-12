import { DatePipe } from '@angular/common';
import { Component, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { CANDIDATE_FRANCHISE_ROLE, FACTORY_MANAGER_ROLE } from '../../core/constants/portal-roles.constants';
import { AuthService } from '../../core/auth/auth.service';
import { PortalPermissionsService } from '../../core/services/portal-permissions.service';
import {
  PortalUserAdminRow,
  PortalUserCreate,
  PortalUserUpdate,
  PortalUsersService,
} from '../../core/services/portal-users.service';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { AdminModulesComponent } from './admin-modules.component';
import { AdminUserModalComponent, AdminUserModalMode } from './admin-user-modal.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe, PageHeroComponent, AdminModulesComponent, AdminUserModalComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly usersService = inject(PortalUsersService);
  private readonly permissions = inject(PortalPermissionsService);
  private readonly auth = inject(AuthService);
  private readonly usersTableRef = viewChild<ElementRef<HTMLElement>>('usersTable');

  readonly users = signal<PortalUserAdminRow[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly modalMode = signal<AdminUserModalMode>('edit');
  readonly editingUser = signal<PortalUserAdminRow | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly subtitleHtml =
    'Visualise, crée et modifie les comptes utilisateurs et leurs rôles.';

  ngOnInit(): void {
    void this.permissions.loadPortalRoles();
    void this.loadUsers();
  }

  async loadUsers(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.users.set(await this.usersService.list());
    } catch (err) {
      console.error('[Admin] load users failed', err);
      this.loadError.set('Impossible de charger les utilisateurs.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.saveError.set(null);
    this.modalMode.set('create');
    this.editingUser.set(null);
    this.modalOpen.set(true);
  }

  openEdit(user: PortalUserAdminRow): void {
    this.saveError.set(null);
    this.modalMode.set('edit');
    this.editingUser.set(user);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingUser.set(null);
    this.saveError.set(null);
  }

  async onCreate(input: PortalUserCreate): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const created = await this.usersService.create(input);
      this.users.update((list) => [...list, created].sort((a, b) => (a.legacy_id ?? 999) - (b.legacy_id ?? 999)));
      this.closeModal();
    } catch (err) {
      console.error('[Admin] create user failed', err);
      this.saveError.set(this.formatSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  async onUpdate(patch: PortalUserUpdate): Promise<void> {
    const user = this.editingUser();
    if (!user) return;

    this.saving.set(true);
    this.saveError.set(null);
    const wasSelf = this.auth.currentUser()?.email === user.email;
    try {
      const updated = await this.usersService.update(user.id, patch);
      this.users.update((list) => list.map((u) => (u.id === updated.id ? updated : u)));

      if (patch.password?.trim()) {
        await this.usersService.setPassword(user.id, patch.password);
      }

      if (wasSelf) {
        await this.auth.reloadProfile();
      }

      this.closeModal();
    } catch (err) {
      console.error('[Admin] save user failed', err);
      this.saveError.set(this.formatSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  scrollToUsers(): void {
    this.usersTableRef()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  roleClass(role: string): string {
    if (role === 'Animateur') return 'r-anim';
    if (role === 'Codir') return 'r-codir';
    if (role === 'Franchisé') return 'r-franchise';
    if (role === FACTORY_MANAGER_ROLE) return 'r-usine';
    if (role === CANDIDATE_FRANCHISE_ROLE) return 'r-candidat';
    return 'r-other';
  }

  trackUser(u: PortalUserAdminRow): string {
    return u.id;
  }

  private formatSaveError(err: unknown): string {
    const msg = this.extractErrorMessage(err);
    if (msg.includes('Email already')) return 'Cet email est déjà utilisé.';
    if (msg.includes('Password must')) return 'Le mot de passe doit contenir au moins 6 caractères.';
    if (msg.includes('no linked auth account')) return 'Cet utilisateur n\'a pas de compte de connexion lié — mot de passe impossible à définir.';
    if (msg.includes('Usine requise')) return 'Sélectionne une usine pour le rôle Responsable d\'usine.';
    if (msg.includes('Usine réservée')) return 'L\'usine ne peut être renseignée que pour le rôle Responsable d\'usine.';
    if (msg.includes('Agence requise')) return 'Sélectionne une agence pour le rôle Franchisé.';
    if (msg.includes('Agence réservée')) return 'L\'agence ne peut être renseignée que pour le rôle Franchisé.';
    if (msg.includes('Forbidden')) return 'Action réservée à l\'Animateur.';
    if (msg.includes('User not found after create')) return 'Utilisateur créé mais rechargement impossible — rafraîchis la page.';
    if (msg.length > 0 && msg.length < 200) return msg;
    return 'Enregistrement impossible. Réessaie.';
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message: string }).message);
    }
    return String(err ?? '');
  }
}
