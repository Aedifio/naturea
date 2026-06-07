import { Injectable, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { FRANCHISES, OssatureView, SITES } from '../constants/ossature.constants';

@Injectable({ providedIn: 'root' })
export class OssatureModeService {
  private readonly router = inject(Router);

  readonly selectedFranchise = signal<string>(FRANCHISES[0]);
  readonly currentSiteUsine = signal<string>(SITES[0]);
  private readonly _routeView = signal<OssatureView>('coord');

  readonly currentView = this._routeView.asReadonly();
  readonly isCoord = computed(() => this._routeView() === 'coord');
  readonly isFranchise = computed(() => this._routeView() === 'franchise');
  readonly isUsine = computed(() => this._routeView() === 'usine');
  readonly isArchives = computed(() => this._routeView() === 'archives');
  readonly showFranchiseSelect = computed(() => this._routeView() === 'franchise');

  constructor() {
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
