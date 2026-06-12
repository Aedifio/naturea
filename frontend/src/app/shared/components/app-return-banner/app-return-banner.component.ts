import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { APPS_META } from '../../../core/models/permissions.model';
import { permissionLabel } from '../../../core/models/kpi.model';
import { AppCode } from '../../../core/models/user.model';

@Component({
  selector: 'app-return-banner',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-return-banner.component.html',
  styleUrl: './app-return-banner.component.scss',
})
export class AppReturnBannerComponent {
  private readonly auth = inject(AuthService);

  /** App code — used to resolve icon, name and permission label from APPS_META. */
  readonly appCode = input<AppCode | undefined>();
  /** Override display title when layout title differs from APPS_META.name */
  readonly title = input<string | undefined>();
  /** Full banner label — skips APPS_META lookup when set */
  readonly labelOverride = input<string | undefined>(undefined, { alias: 'label' });

  /** Apps shown in the persistent switcher (Admin is rendered separately). */
  readonly navApps = APPS_META.filter((a) => a.code !== 'ADMIN' && !a.hideFromNav);

  readonly showPortalReturn = computed(() => this.auth.canAccessPortail());
  readonly canShowAdmin = computed(() => this.auth.canAccess('ADMIN'));

  readonly displayLabel = computed(() => {
    const override = this.labelOverride();
    if (override) return override;

    // Track session so label updates after auth restore on hard refresh
    this.auth.currentUser();

    const code = this.appCode();
    const app = code ? APPS_META.find((a) => a.code === code) : undefined;
    const name = this.title() ?? app?.name ?? '';
    const icon = app?.icon ?? '';
    const perm = code ? permissionLabel(this.auth.getPermission(code)) : '';
    const suffix = perm ? ` · ${perm}` : '';
    return `${icon} ${name}${suffix}`.trim();
  });

  canShow(code: AppCode): boolean {
    // Track session so buttons appear/update after auth restore on hard refresh
    this.auth.currentUser();
    return this.auth.canAccess(code);
  }

  permLabel(code: AppCode): string {
    return permissionLabel(this.auth.getPermission(code));
  }

  logout(): void {
    void this.auth.logout();
  }
}
