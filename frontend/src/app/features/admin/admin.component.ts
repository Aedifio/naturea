import { Component, ElementRef, viewChild } from '@angular/core';
import { SEED_USERS } from '../../core/models/permissions.model';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

interface AdminTile {
  icon: string;
  name: string;
  desc: string;
  action: 'users' | 'permissions' | 'franchises' | 'journal';
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [PageHeroComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent {
  private readonly usersTableRef = viewChild<ElementRef<HTMLElement>>('usersTable');

  readonly users = SEED_USERS;

  readonly subtitleHtml =
    'Visualise les comptes utilisateurs et leurs permissions.';

  readonly tiles: AdminTile[] = [
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
      desc: 'Annuaire des 17 agences du réseau',
      action: 'franchises',
    },
    {
      icon: '📝',
      name: 'Journal',
      desc: 'Connexions et actions sensibles',
      action: 'journal',
    },
  ];

  onTileClick(action: AdminTile['action']): void {
    switch (action) {
      case 'users':
        this.scrollToUsers();
        break;
      case 'permissions':
        alert('Pour modifier les permissions, ouvre le fichier Excel gestion_acces_naturea.xlsx');
        break;
      case 'franchises':
        alert('Onglet Codir à venir — voir vue Codir');
        break;
      case 'journal':
        alert("Journal d'activité à venir");
        break;
    }
  }

  roleClass(role: string): string {
    if (role === 'Animateur') return 'r-anim';
    if (role === 'Codir') return 'r-codir';
    if (role === 'Franchisé') return 'r-franchise';
    return 'r-other';
  }

  private scrollToUsers(): void {
    this.usersTableRef()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
