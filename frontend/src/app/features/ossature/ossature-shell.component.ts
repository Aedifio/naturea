import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AgencyService } from '../../core/services/agency.service';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { NATUREA_LOGO } from '../../shared/constants/branding';
import { OssatureAlertBannerComponent } from './components/ossature-alert-banner.component';
import { OssatureDetailModalComponent } from './components/ossature-detail-modal.component';
import { OssatureNewOrderModalComponent } from './components/ossature-new-order-modal.component';
import { OssatureSignatureModalComponent } from './components/ossature-signature-modal.component';
import { OssatureToastComponent } from './components/ossature-toast.component';
import { OssatureView } from './constants/ossature.constants';
import { OssatureModeService } from './services/ossature-mode.service';

const OSSATURE_NAV: Array<{ label: string; route: string; icon: string; view: OssatureView }> = [
  { label: 'Coordinateur', route: '/apps/ossature', icon: '📊', view: 'coord' },
  { label: 'Franchisé', route: '/apps/ossature/franchise', icon: '🏠', view: 'franchise' },
  { label: 'Usine', route: '/apps/ossature/usine', icon: '🏭', view: 'usine' },
  { label: 'Archives', route: '/apps/ossature/archives', icon: '📦', view: 'archives' },
];

@Component({
  selector: 'app-ossature-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AppReturnBannerComponent,
    OssatureToastComponent,
    OssatureAlertBannerComponent,
    OssatureDetailModalComponent,
    OssatureNewOrderModalComponent,
    OssatureSignatureModalComponent,
  ],
  templateUrl: './ossature-shell.component.html',
  styleUrl: './ossature-shell.component.scss',
  host: { class: 'ossature-app' },
})
export class OssatureShellComponent {
  private readonly agencies = inject(AgencyService);
  readonly mode = inject(OssatureModeService);
  readonly logo = NATUREA_LOGO;

  readonly franchises = computed(() => {
    this.agencies.agencies();
    return this.agencies.getNames();
  });

  readonly nav = computed(() => {
    const allowed = new Set(this.mode.visibleNavViews());
    return OSSATURE_NAV.filter((item) => allowed.has(item.view));
  });

  onFranchiseChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this.mode.setFranchise(value);
  }
}
