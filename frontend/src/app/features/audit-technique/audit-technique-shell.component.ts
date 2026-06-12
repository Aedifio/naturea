import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { NATUREA_LOGO } from '../../shared/constants/branding';
import { AuditTechniqueDataService } from './services/audit-technique-data.service';
import { activeAudits, avgAudits, scoreColor } from './utils/audit-score.util';

@Component({
  selector: 'app-audit-technique-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppReturnBannerComponent],
  templateUrl: './audit-technique-shell.component.html',
  styleUrl: './audit-technique-shell.component.scss',
  host: { class: 'audit-tech-app' },
})
export class AuditTechniqueShellComponent {
  readonly data = inject(AuditTechniqueDataService);
  private readonly auth = inject(AuthService);
  readonly logo = NATUREA_LOGO;

  readonly isAgencyScoped = computed(() => this.auth.isAgencyScopedFranchisee());

  readonly sidebarOpen = signal(false);

  readonly agencesNav = computed(() =>
    [...this.data.agences()]
      .map((a) => ({ ...a, score: avgAudits(activeAudits(a.audits)) }))
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1)),
  );

  readonly openUrgents = computed(() => this.data.openUrgentsCount());

  readonly scoreColor = scoreColor;

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }
}
