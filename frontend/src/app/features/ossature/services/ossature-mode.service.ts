import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { AgencyService } from '../../../core/services/agency.service';
import { FactoryService } from '../../../core/services/factory.service';
import { OssatureView } from '../constants/ossature.constants';

@Injectable({ providedIn: 'root' })
export class OssatureModeService {
  private readonly router = inject(Router);
  private readonly factory = inject(FactoryService);
  private readonly agencies = inject(AgencyService);
  private readonly auth = inject(AuthService);

  readonly selectedFranchise = signal<string>('');
  readonly currentSiteUsine = signal<string>('');
  private readonly _routeView = signal<OssatureView>('coord');

  readonly currentView = this._routeView.asReadonly();
  readonly isCoord = computed(() => this._routeView() === 'coord');
  readonly isFranchise = computed(() => this._routeView() === 'franchise');
  readonly isUsine = computed(() => this._routeView() === 'usine');
  readonly isArchives = computed(() => this._routeView() === 'archives');
  readonly showFranchiseSelect = computed(() => this._routeView() === 'franchise');

  constructor() {
    effect(() => {
      const sites = this.factory.getOssatureSites();
      if (!sites.length) return;
      if (!sites.includes(this.currentSiteUsine())) {
        this.currentSiteUsine.set(sites[0]);
      }
    });

    effect(() => {
      this.agencies.agencies();
      const names = this.agencies.getNames();
      if (!names.length) return;

      const current = this.selectedFranchise();
      if (current && names.includes(current)) return;

      if (current) {
        const resolved = this.agencies.resolveFranchiseName(current);
        if (resolved) {
          this.selectedFranchise.set(resolved);
          return;
        }
      }

      const userFranchise = this.auth.currentUser()?.franchise;
      if (userFranchise && userFranchise !== '(siège)') {
        const resolved = this.agencies.resolveFranchiseName(userFranchise);
        if (resolved) {
          this.selectedFranchise.set(resolved);
          return;
        }
      }

      this.selectedFranchise.set(names[0]);
    });

    this.syncFromUrl(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.syncFromUrl(e.urlAfterRedirects));
  }

  private syncFromUrl(url: string): void {
    if (url.includes('/franchise')) this._routeView.set('franchise');
    else if (url.includes('/usine')) this._routeView.set('usine');
    else if (url.includes('/archives')) this._routeView.set('archives');
    else this._routeView.set('coord');
  }

  setFranchise(value: string): void {
    this.selectedFranchise.set(value);
  }

  setSiteUsine(site: string): void {
    this.currentSiteUsine.set(site);
  }
}
