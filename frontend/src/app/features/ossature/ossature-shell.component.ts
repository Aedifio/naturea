import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { NATUREA_LOGO } from '../../shared/constants/branding';
import { FRANCHISES } from './constants/ossature.constants';
import { OssatureAlertBannerComponent } from './components/ossature-alert-banner.component';
import { OssatureDetailModalComponent } from './components/ossature-detail-modal.component';
import { OssatureNewOrderModalComponent } from './components/ossature-new-order-modal.component';
import { OssatureSignatureModalComponent } from './components/ossature-signature-modal.component';
import { OssatureToastComponent } from './components/ossature-toast.component';
import { OssatureModeService } from './services/ossature-mode.service';

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
  readonly mode = inject(OssatureModeService);
  readonly logo = NATUREA_LOGO;
  readonly franchises = FRANCHISES;

  readonly nav = [
    { label: 'Coordinateur', route: '/apps/ossature', icon: '📊', view: 'coord' as const },
    { label: 'Franchisé', route: '/apps/ossature/franchise', icon: '🏠', view: 'franchise' as const },
    { label: 'Usine', route: '/apps/ossature/usine', icon: '🏭', view: 'usine' as const },
    { label: 'Archives', route: '/apps/ossature/archives', icon: '📦', view: 'archives' as const },
  ];

  onFranchiseChange(e: Event): void {
    const value = (e.target as HTMLSelectElement).value;
    this.mode.setFranchise(value);
  }
}
