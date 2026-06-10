import { Component, computed, inject, input } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { APPS_META } from '../../../core/models/permissions.model';
import { permissionLabel } from '../../../core/models/kpi.model';
import { AppCode } from '../../../core/models/user.model';
import { NATUREA_LOGO } from '../../constants/branding';
import { PageHeroComponent } from '../page-hero/page-hero.component';

/**
 * Bandeau de navigation unifié, présent en haut de toutes les apps et du portail.
 * - Barre fixe « alfred » : accueil + accès direct aux autres apps + utilisateur (comme l'accueil).
 * - Hero vert reprenant le nom de l'app courante (équivalent « Espace réseau »).
 * Conserve les entrées appCode / title / label déjà passées par les shells existants.
 */
@Component({
  selector: 'app-return-banner',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, PageHeroComponent],
  templateUrl: './app-return-banner.component.html',
  styleUrl: './app-return-banner.component.scss',
})
export class AppReturnBannerComponent {
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);

  /** App courante — résout nom / description / permission depuis APPS_META. */
  readonly appCode = input<AppCode | undefined>();
  /** Titre du hero quand il diffère de APPS_META.name. */
  readonly title = input<string | undefined>();
  /** Libellé complet — court-circuite APPS_META lorsqu'il est fourni. */
  readonly labelOverride = input<string | undefined>(undefined, { alias: 'label' });

  readonly logo = NATUREA_LOGO;
  readonly user = this.auth.currentUser;
  readonly navApps = APPS_META.filter((a) => a.code !== 'ADMIN');

  readonly initials = computed(() => {
    const u = this.user();
    if (!u) return '??';
    return u.name
      .split(' ')
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  });

  /** Nom affiché dans le hero (vide => pas de hero, ex. pages du portail). */
  readonly heroName = computed(() => {
    const t = this.title();
    if (t) return t;
    const code = this.appCode();
    const app = code ? APPS_META.find((a) => a.code === code) : undefined;
    if (app) return app.name;
    return this.labelOverride() ?? '';
  });

  readonly heroKicker = computed(() => {
    const code = this.appCode();
    if (!code) return 'Application';
    // Suit la session pour rafraîchir après restauration d'auth.
    this.auth.currentUser();
    return permissionLabel(this.auth.getPermission(code)) || 'Application';
  });

  readonly heroDesc = computed(() => {
    const code = this.appCode();
    const app = code ? APPS_META.find((a) => a.code === code) : undefined;
    return app?.desc ?? '';
  });

  readonly showHero = computed(() => !!this.heroName());

  canShow(code: AppCode): boolean {
    return this.auth.canAccess(code);
  }

  permLabel(code: AppCode): string {
    return permissionLabel(this.auth.getPermission(code));
  }

  isAppActive(code: AppCode): boolean {
    const app = APPS_META.find((a) => a.code === code);
    if (!app) return false;
    if (code === 'RESEAU') return this.router.url.startsWith('/reseau');
    if (code === 'ADMIN') return this.router.url.startsWith('/admin');
    return app.route.startsWith('/apps/') && this.router.url.startsWith(app.route);
  }

  logout(): void {
    this.auth.logout();
  }
}
