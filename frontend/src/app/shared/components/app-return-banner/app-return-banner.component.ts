import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  input,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { APPS_META } from '../../../core/models/permissions.model';
import { permissionLabel } from '../../../core/models/kpi.model';
import { AppCode } from '../../../core/models/user.model';
import { NATUREA_LOGO } from '../../constants/branding';

@Component({
  selector: 'app-return-banner',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './app-return-banner.component.html',
  styleUrl: './app-return-banner.component.scss',
})
export class AppReturnBannerComponent implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);

  /** Banner element — its real height drives --return-banner-h so layouts stay aligned. */
  @ViewChild('bar') private barRef?: ElementRef<HTMLElement>;
  private resizeObserver?: ResizeObserver;

  readonly logo = NATUREA_LOGO;
  readonly user = this.auth.currentUser;

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

  ngAfterViewInit(): void {
    const el = this.barRef?.nativeElement;
    if (!el || typeof ResizeObserver === 'undefined') return;
    this.resizeObserver = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--return-banner-h', `${el.offsetHeight}px`);
    });
    this.resizeObserver.observe(el);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

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
