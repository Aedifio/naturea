import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NATUREA_LOGO } from '../../shared/constants/branding';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { AppCode } from '../../core/models/user.model';

export interface SidebarNavItem {
  label: string;
  route: string;
  icon?: string;
}

export interface SidebarLayoutConfig {
  variant?: 'recrut' | 'audit-tech' | 'default';
  appCode?: AppCode;
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  navItems: SidebarNavItem[];
}

@Component({
  selector: 'app-sidebar-app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppReturnBannerComponent],
  templateUrl: './sidebar-app-layout.component.html',
  styleUrl: './sidebar-app-layout.component.scss',
})
export class SidebarAppLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  readonly layout = this.route.snapshot.data['layout'] as SidebarLayoutConfig;
  readonly logo = NATUREA_LOGO;
}
