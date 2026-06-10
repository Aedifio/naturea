import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { AuditComSettingsModalComponent } from './components/audit-com-settings-modal.component';
import { AuditCommerceDataService } from './services/audit-commerce-data.service';
import { AuditCommerceUiService } from './services/audit-commerce-ui.service';
import { monthNoteStats, noteVar } from './utils/audit-commerce.utils';

@Component({
  selector: 'app-audit-commerce-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppReturnBannerComponent, AuditComSettingsModalComponent],
  templateUrl: './audit-commerce-shell.component.html',
  styleUrl: './audit-commerce-shell.component.scss',
  host: { class: 'audit-com-app' },
})
export class AuditCommerceShellComponent {
  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);
  private readonly auth = inject(AuthService);

  readonly isAgencyScoped = computed(() => this.auth.isAgencyScopedFranchisee());

  readonly agenciesNav = computed(() => {
    const ym = this.ui.ym();
    const th = this.data.settings().noteThreshold;
    return this.data.agencies().map((a) => ({
      ...a,
      note: monthNoteStats(a, ym).agency,
      dotColor: noteVar(monthNoteStats(a, ym).agency, th),
    }));
  });

  onYmChange(e: Event): void {
    this.ui.setYm((e.target as HTMLInputElement).value);
  }
}
