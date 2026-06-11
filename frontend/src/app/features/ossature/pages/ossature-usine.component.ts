import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FactoryService } from '../../../core/services/factory.service';
import { OssatureBadgeComponent } from '../components/ossature-badge.component';
import { OssatureOrderTagsComponent } from '../components/ossature-order-tags.component';
import { formatDeliveryDate, formatSurfaceM2, orderYear, OssatureDataService, surfaceM2 } from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';
import { OssatureModeService } from '../services/ossature-mode.service';

@Component({
  selector: 'app-ossature-usine',
  standalone: true,
  imports: [FormsModule, OssatureBadgeComponent, OssatureOrderTagsComponent],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Vue Usine</div>
        <div class="page-sub">Production en cours et à venir</div>
      </div>
    </div>

    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; flex-wrap: wrap; gap: 8px">
      @if (!mode.isFactoryScoped()) {
        <div class="site-pills" style="margin-bottom: 0">
          @for (s of sites(); track s) {
            <button type="button" class="site-pill" [class.active]="mode.currentSiteUsine() === s" (click)="mode.setSiteUsine(s)">{{ s }}</button>
          }
        </div>
      } @else {
        <div class="page-sub" style="margin: 0">{{ mode.currentSiteUsine() }}</div>
      }
      <select class="year-select" [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event)">
        <option [ngValue]="currentYear">Année en cours</option>
        @for (y of years(); track y) {
          @if (y !== currentYear) {
            <option [ngValue]="y">{{ y }}</option>
          }
        }
      </select>
    </div>

    @if (yearStats(); as ys) {
      <div style="display: flex; justify-content: flex-end; margin-bottom: 12px">
        <div style="display: inline-flex; align-items: center; gap: 16px; background: #fff; border-radius: 10px; padding: 8px 16px; box-shadow: var(--shadow); font-size: 12px; color: var(--muted)">
          <span style="color: var(--faint); font-weight: 500">📊 {{ selectedYear() }}</span>
          <span><span style="font-weight: 700; color: #3b6fe8">{{ ys.allCount }} cmd</span> · <span style="font-weight: 700; color: #3b6fe8">{{ ys.m2Total }} m²</span> <span style="color: var(--faint)"> reçus</span></span>
          <span>·</span>
          <span><span style="font-weight: 700; color: #22c55e">{{ ys.livCount }} cmd</span> · <span style="font-weight: 700; color: #22c55e">{{ ys.m2Livrees }} m²</span> <span style="color: var(--faint)"> livrés</span></span>
        </div>
      </div>
    }

    <div class="stats-row">
      @for (s of usineStats(); track s.label) {
        <div class="stat-card" [style.border-left-color]="s.color">
          <div class="stat-val" [style.color]="s.color">{{ s.val }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      }
    </div>

    <div class="card-list">
      @if (!siteOrders().length) {
        <div class="empty">Aucune commande active sur ce site</div>
      } @else {
        @for (o of siteOrders(); track o.id) {
          <div class="order-card" (click)="modals.openDetail(o.id)">
            <div class="card-main">
              <div class="card-ref">{{ o.reference }}</div>
              <div class="card-sub">{{ data.agencyLabel(o) }} · {{ o.id }}</div>
            </div>
            <div class="card-meta">{{ formatSurfaceM2(o.surface) }}</div>
            <div class="card-meta" [style.color]="o.docs.length ? 'var(--blue)' : 'var(--faint)'">
              {{ o.docs.length ? '📄 ' + o.docs.length + ' doc(s)' : '📄 Aucun doc' }}
            </div>
            <div class="card-meta">📅 {{ formatDeliveryDate(o.deliveryDate) }}</div>
            <app-ossature-badge [statut]="o.statut" />
            <app-ossature-order-tags [order]="o" />
          </div>
        }
      }
    </div>
  `,
  styles: `.year-select { border: 1.5px solid var(--border); border-radius: 10px; padding: 7px 14px; font-size: 13px; font-family: inherit; background: #fff; font-weight: 600; color: var(--text); }`,
})
export class OssatureUsineComponent {
  readonly data = inject(OssatureDataService);
  readonly modals = inject(OssatureModalService);
  readonly mode = inject(OssatureModeService);
  private readonly factory = inject(FactoryService);

  readonly formatSurfaceM2 = formatSurfaceM2;
  readonly formatDeliveryDate = formatDeliveryDate;

  readonly sites = computed(() => {
    const scoped = this.mode.allowedOssatureSite();
    if (scoped) return [scoped];
    return this.factory.mergeOssatureSites(...this.data.orders().map((o) => this.data.factorySiteLabel(o)));
  });
  readonly currentYear = new Date().getFullYear();
  readonly selectedYear = signal(this.currentYear);

  readonly years = computed(() => this.data.availableYears());

  readonly siteOrders = computed(() =>
    this.data
      .orders()
      .filter(
        (o) =>
          this.data.factorySiteLabel(o) === this.mode.currentSiteUsine() &&
          !o.archived &&
          orderYear(o.created) === this.selectedYear(),
      ),
  );

  readonly yearStats = computed(() => {
    const site = this.mode.currentSiteUsine();
    const year = this.selectedYear();
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    const allSiteYearOrders = this.data.orders().filter(
      (o) => this.data.factorySiteLabel(o) === site && orderYear(o.created) === year,
    );
    const livraeesYear = this.data.orders().filter(
      (o) =>
        this.data.factorySiteLabel(o) === site &&
        o.statut === 'Expédition validée' &&
        o.livraison_definitive &&
        o.livraison_definitive >= yearStart &&
        o.livraison_definitive <= yearEnd,
    );
    const m2Total = allSiteYearOrders.reduce((acc, o) => acc + surfaceM2(o.surface), 0);
    const m2Livrees = livraeesYear.reduce((acc, o) => acc + surfaceM2(o.surface), 0);
    return {
      allCount: allSiteYearOrders.length,
      m2Total: m2Total.toFixed(0),
      livCount: livraeesYear.length,
      m2Livrees: m2Livrees.toFixed(0),
    };
  });

  readonly usineStats = computed(() => {
    const list = this.siteOrders();
    return [
      { label: 'Devis demandé', val: list.filter((o) => o.statut === 'Devis demandé').length, color: '#f59e0b' },
      { label: 'Devis envoyé', val: list.filter((o) => o.statut === 'Devis envoyé').length, color: '#3b82f6' },
      { label: 'À produire', val: list.filter((o) => o.statut === 'Commande confirmée').length, color: '#22c55e' },
      { label: 'Expédition validée', val: list.filter((o) => o.statut === 'Expédition validée').length, color: '#8b5cf6' },
    ];
  });
}
