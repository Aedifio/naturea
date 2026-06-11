import { Component, computed, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { permissionLabel } from '../../core/models/kpi.model';
import { APPS_META } from '../../core/models/permissions.model';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { ChiffrageToastComponent } from './components/chiffrage-toast.component';
import { ChiffrageDataService } from './services/chiffrage-data.service';

@Component({
  selector: 'app-chiffrage-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppReturnBannerComponent, ChiffrageToastComponent],
  templateUrl: './chiffrage-shell.component.html',
  styleUrl: './chiffrage-shell.component.scss',
})
export class ChiffrageShellComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly data = inject(ChiffrageDataService);

  readonly headStats = computed(() => this.data.headStats());
  readonly mesProjetsBadge = computed(() => this.data.projets().length);
  readonly historiqueBadge = computed(() => this.data.tarifsHistoryCount());

  readonly bannerLabel = computed(() => {
    this.auth.currentUser();
    const app = APPS_META.find((a) => a.code === 'CHIFFRAGE');
    const perm = permissionLabel(this.auth.getPermission('CHIFFRAGE'));
    const suffix = perm ? ` · ${perm}` : '';
    return `${app?.icon ?? '💰'} ${app?.name ?? 'Chiffrage Naturéa'}${suffix}`;
  });

  constructor() {
    this.data.hydrateFromStorage();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.data.hydrateFromStorage());
  }
}
