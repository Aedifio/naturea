import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { NATUREA_LOGO } from '../../shared/constants/branding';
import { CodirDataService } from '../../core/services/codir-data.service';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { AppCode } from '../../core/models/user.model';

import { CodirIconName } from '../../shared/components/codir-icon/codir-icons';
import { CodirIconComponent } from '../../shared/components/codir-icon/codir-icon.component';

export interface TabNavItem {
  label: string;
  route: string;
  iconName?: CodirIconName;
  badge?: number;
  badgeMuted?: boolean;
}

export interface TabsLayoutConfig {
  variant?: 'codir' | 'ossature' | 'default';
  appCode?: AppCode;
  title: string;
  tag?: string;
  showLogo?: boolean;
  subtitle?: string;
  maxWidth?: number;
  navItems: TabNavItem[];
}

@Component({
  selector: 'app-tabs-app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppReturnBannerComponent, CodirIconComponent],
  templateUrl: './tabs-app-layout.component.html',
  styleUrl: './tabs-app-layout.component.scss',
})
export class TabsAppLayoutComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly codir = inject(CodirDataService);

  readonly layout = this.route.snapshot.data['layout'] as TabsLayoutConfig;
  readonly logo = NATUREA_LOGO;

  readonly navItems = computed(() => {
    const items = this.layout.navItems;
    if (this.layout.variant !== 'codir') return items;
    return items.map((item) => {
      if (item.route.endsWith('/actions')) {
        return { ...item, badge: this.codir.overdueCount() || undefined };
      }
      if (item.route.endsWith('/archives')) {
        return { ...item, badge: this.codir.archivedCount() || undefined, badgeMuted: true };
      }
      return item;
    });
  });

  readonly showOverdueAlert = computed(() => this.layout.variant === 'codir' && this.codir.overdueCount() > 0);
  readonly overdueCount = this.codir.overdueCount;

  /** Root tabs (e.g. /apps/codir) must not stay active on child routes (/apps/codir/actions). */
  tabLinkExact(route: string): boolean {
    return this.layout.navItems.some((other) => other.route !== route && other.route.startsWith(`${route}/`));
  }
}
