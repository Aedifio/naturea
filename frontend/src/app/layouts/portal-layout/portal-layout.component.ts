import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APPS_META } from '../../core/models/permissions.model';
import { AppCode } from '../../core/models/user.model';
import { permissionLabel } from '../../core/models/kpi.model';
import { NATUREA_LOGO } from '../../shared/constants/branding';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './portal-layout.component.html',
  styleUrl: './portal-layout.component.scss',
})
export class PortalLayoutComponent {
  private readonly auth = inject(AuthService);
  readonly router = inject(Router);

  readonly user = this.auth.currentUser;
  readonly logo = NATUREA_LOGO;
  readonly navApps = APPS_META.filter((a) => a.code !== 'ADMIN' && !a.hideFromNav);
  readonly portalHomeLink = computed(() =>
    this.auth.canAccessPortail() ? '/home' : this.auth.firstAccessibleAppRoute(),
  );

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

  canShow(code: AppCode): boolean {
    return this.auth.canAccess(code);
  }

  canShowPortail(): boolean {
    return this.auth.canAccessPortail();
  }

  permLabel(code: AppCode): string {
    return permissionLabel(this.auth.getPermission(code));
  }

  logout(): void {
    this.auth.logout();
  }

  isAppRoute(code: AppCode): boolean {
    const app = APPS_META.find((a) => a.code === code);
    if (!app?.route.startsWith('/apps/')) return false;
    return this.router.url.startsWith(app.route);
  }
}
