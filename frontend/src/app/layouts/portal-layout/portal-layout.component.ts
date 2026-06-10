import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';

@Component({
  selector: 'app-portal-layout',
  standalone: true,
  imports: [RouterOutlet, AppReturnBannerComponent],
  templateUrl: './portal-layout.component.html',
  styleUrl: './portal-layout.component.scss',
})
export class PortalLayoutComponent {}
