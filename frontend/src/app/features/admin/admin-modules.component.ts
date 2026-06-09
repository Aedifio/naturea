import { Component, inject, input, output } from '@angular/core';
import { Router } from '@angular/router';

export type AdminModuleAction = 'users' | 'permissions' | 'factories' | 'franchises';

export interface AdminModuleTile {
  icon: string;
  name: string;
  desc: string;
  action: AdminModuleAction;
}

export const ADMIN_MODULE_TILES: AdminModuleTile[] = [
  {
    icon: '👥',
    name: 'Utilisateurs',
    desc: 'Voir les comptes actifs et leurs rôles',
    action: 'users',
  },
  {
    icon: '🔐',
    name: 'Permissions',
    desc: 'Matrice rôles × applications',
    action: 'permissions',
  },
  {
    icon: '🏛️',
    name: 'Franchises',
    desc: 'Annuaire des agences du réseau',
    action: 'franchises',
  },
  {
    icon: '🏭',
    name: 'Usines',
    desc: 'Créer et modifier les usines du réseau',
    action: 'factories',
  },
];

@Component({
  selector: 'app-admin-modules',
  standalone: true,
  templateUrl: './admin-modules.component.html',
  styleUrl: './admin-modules.component.scss',
})
export class AdminModulesComponent {
  private readonly router = inject(Router);

  /** Highlights the current admin section. */
  readonly active = input<AdminModuleAction | null>(null);

  /** Fired when « Utilisateurs » is clicked while already on /admin. */
  readonly scrollToUsers = output<void>();

  readonly tiles = ADMIN_MODULE_TILES;

  onTileClick(action: AdminModuleAction): void {
    if (action === this.active()) return;

    switch (action) {
      case 'users':
        if (this.router.url === '/admin' || this.router.url.startsWith('/admin?')) {
          this.scrollToUsers.emit();
        } else {
          void this.router.navigate(['/admin']);
        }
        break;
      case 'permissions':
        void this.router.navigate(['/admin/roles']);
        break;
      case 'factories':
        void this.router.navigate(['/admin/factories']);
        break;
      case 'franchises':
        void this.router.navigate(['/admin/agencies']);
        break;
    }
  }
}
