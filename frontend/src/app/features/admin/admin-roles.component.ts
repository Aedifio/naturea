import { Component, inject, OnInit, signal } from '@angular/core';
import { CANDIDATE_FRANCHISE_ROLE, FACTORY_MANAGER_ROLE } from '../../core/constants/portal-roles.constants';
import { FormsModule } from '@angular/forms';
import { APPS_META } from '../../core/models/permissions.model';
import { permissionLabel } from '../../core/models/kpi.model';
import { AppCode, PermissionLevel } from '../../core/models/user.model';
import {
  PortalPermissionsService,
  RolePermissionRow,
} from '../../core/services/portal-permissions.service';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { AdminModulesComponent } from './admin-modules.component';

type PermChoice = PermissionLevel | '';

const PERM_OPTIONS: { value: PermChoice; label: string }[] = [
  { value: '', label: '—' },
  { value: 'R', label: 'Lecture' },
  { value: 'RW', label: 'Écriture' },
  { value: 'ADMIN', label: 'Admin' },
];

@Component({
  selector: 'app-admin-roles',
  standalone: true,
  imports: [FormsModule, PageHeroComponent, AdminModulesComponent],
  templateUrl: './admin-roles.component.html',
  styleUrl: './admin-roles.component.scss',
})
export class AdminRolesComponent implements OnInit {
  private readonly permissions = inject(PortalPermissionsService);

  readonly apps = APPS_META;
  readonly permOptions = PERM_OPTIONS;

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly saveError = signal<string | null>(null);
  readonly saveOk = signal(false);
  readonly roles = signal<{ id: string; name: string }[]>([]);

  /** Editable copy: role_id → app → level */
  readonly draft = signal<Record<string, Partial<Record<AppCode, PermChoice>>>>({});

  readonly subtitleHtml =
    'Matrice d\'accès par rôle et par application. Les changements s\'appliquent à tous les utilisateurs ayant ce rôle.';

  ngOnInit(): void {
    void this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.saveOk.set(false);
    try {
      const rows = await this.permissions.load();
      if (!rows.length) {
        throw new Error('Aucune permission retournée par la base de données.');
      }
      this.applyDraft(rows);
    } catch (err) {
      console.error('[AdminRoles] load failed', err);
      this.draft.set({});
      this.roles.set([]);
      this.loadError.set('Impossible de charger les permissions.');
    } finally {
      this.loading.set(false);
    }
  }

  cellValue(roleId: string, app: AppCode): PermChoice {
    return this.draft()[roleId]?.[app] ?? '';
  }

  setCell(roleId: string, app: AppCode, value: PermChoice): void {
    this.draft.update((d) => {
      const next = { ...d, [roleId]: { ...d[roleId], [app]: value || undefined } };
      if (!value) delete next[roleId][app];
      return next;
    });
    this.saveOk.set(false);
  }

  permLabel(value: PermChoice): string {
    if (!value) return '—';
    return permissionLabel(value);
  }

  roleClass(roleName: string): string {
    if (roleName === 'Animateur') return 'r-anim';
    if (roleName === 'Codir') return 'r-codir';
    if (roleName === 'Franchisé') return 'r-franchise';
    if (roleName === FACTORY_MANAGER_ROLE) return 'r-usine';
    if (roleName === CANDIDATE_FRANCHISE_ROLE) return 'r-candidat';
    return 'r-other';
  }

  async saveAll(): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveOk.set(false);
    try {
      for (const role of this.roles()) {
        await this.permissions.saveRole(role.id, this.draftToPermissions(role.id), false);
      }
      const rows = await this.permissions.load();
      this.applyDraft(rows);
      this.saveOk.set(true);
    } catch (err) {
      console.error('[AdminRoles] save failed', err);
      this.saveError.set('Enregistrement impossible. Réessaie.');
    } finally {
      this.saving.set(false);
    }
  }

  private applyDraft(rows: RolePermissionRow[]): void {
    const draft = this.buildDraft(rows);
    this.draft.set(draft);
    this.roles.set(
      Object.keys(draft)
        .map((id) => ({ id, name: this.permissions.roleNameById(id) }))
        .filter((r) => r.name)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    );
  }

  private buildDraft(rows: RolePermissionRow[]): Record<string, Partial<Record<AppCode, PermChoice>>> {
    const matrix = this.permissions.rowsToMatrix(rows);
    const draft: Record<string, Partial<Record<AppCode, PermChoice>>> = {};
    for (const roleId of Object.keys(matrix)) {
      draft[roleId] = { ...matrix[roleId] };
    }
    return draft;
  }

  private draftToPermissions(roleId: string): Partial<Record<AppCode, PermissionLevel>> {
    const row = this.draft()[roleId] ?? {};
    const out: Partial<Record<AppCode, PermissionLevel>> = {};
    for (const [app, level] of Object.entries(row)) {
      if (level) out[app as AppCode] = level as PermissionLevel;
    }
    return out;
  }
}
