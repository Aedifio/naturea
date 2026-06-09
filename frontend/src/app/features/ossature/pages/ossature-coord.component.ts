import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FactoryService } from '../../../core/services/factory.service';
import { AgencyService } from '../../../core/services/agency.service';
import { STATUTS, STATUT_STYLE } from '../constants/ossature.constants';
import { OssatureBadgeComponent } from '../components/ossature-badge.component';
import { OssatureOrderTagsComponent } from '../components/ossature-order-tags.component';
import {
  isLivraisonDefDelayed,
  OssatureDataService,
  parseSurface,
} from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';

@Component({
  selector: 'app-ossature-coord',
  standalone: true,
  imports: [FormsModule, DatePipe, OssatureBadgeComponent, OssatureOrderTagsComponent],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Vision globale</div>
        <div class="page-sub" style="color: var(--green)">Réseau Naturéa — {{ franchiseCount() }} franchisés · {{ factoryCount() }} sites de production</div>
      </div>
      <select class="year-select" [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event)">
        <option [ngValue]="currentYear">Année en cours</option>
        @for (y of years(); track y) {
          @if (y !== currentYear) {
            <option [ngValue]="y">{{ y }}</option>
          }
        }
      </select>
    </div>

    @if (m2Stats(); as m2) {
      <div style="display: flex; justify-content: flex-end; margin-bottom: 12px">
        <div style="display: inline-flex; align-items: center; gap: 16px; background: #fff; border-radius: 10px; padding: 8px 16px; box-shadow: var(--shadow); font-size: 12px; color: var(--muted)">
          <span style="color: var(--faint); font-weight: 500">📊 {{ selectedYear() }}</span>
          <span><span style="font-weight: 700; color: #3b6fe8">{{ m2.nbCmd }} cmd</span> · <span style="font-weight: 700; color: #3b6fe8">{{ m2.m2Total }} m²</span> <span style="color: var(--faint)"> reçus</span></span>
          <span>·</span>
          <span><span style="font-weight: 700; color: #22c55e">{{ m2.nbLivrees }} cmd</span> · <span style="font-weight: 700; color: #22c55e">{{ m2.m2Livrees }} m²</span> <span style="color: var(--faint)"> livrés</span></span>
        </div>
      </div>
    }

    <div class="stats-row">
      @for (s of statuts; track s) {
        <div class="stat-card" [style.border-left-color]="statutStyle(s).dot">
          <div class="stat-val" [style.color]="statutStyle(s).dot">{{ statCount(s) }}</div>
          <div class="stat-label" style="font-size: 11px">{{ statutLabel(s) }}</div>
        </div>
      }
    </div>

    <div class="site-chips">
      @for (chip of siteChips(); track chip.site) {
        <div
          class="site-chip"
          [style.background]="chip.hasDelay ? '#fef2f2' : 'var(--blue-light)'"
          [style.color]="chip.hasDelay ? '#dc2626' : 'var(--blue)'"
          [style.border]="chip.hasDelay ? '2px solid #fca5a5' : 'none'"
          style="cursor: pointer"
          (click)="filterBySite(chip.site)"
        >
          <b>{{ chip.hasDelay ? '⚠️ ' : '' }}{{ chip.count }}</b> {{ chip.site }}
        </div>
      }
    </div>

    <div class="filters">
      <select [ngModel]="filterFranchise()" (ngModelChange)="filterFranchise.set($event)">
        <option value="">Tous les franchisés</option>
        @for (f of franchises(); track f) {
          <option [value]="f">{{ f }}</option>
        }
      </select>
      <select [ngModel]="filterSite()" (ngModelChange)="filterSite.set($event)">
        <option value="">Toutes les usines</option>
        @for (s of sites(); track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
      <select [ngModel]="filterStatut()" (ngModelChange)="filterStatut.set($event)">
        <option value="">Tous statuts</option>
        @for (s of statuts; track s) {
          <option [value]="s">{{ s }}</option>
        }
      </select>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Franchisé</th><th>Référence</th><th>Surface</th><th>Site</th><th>Livraison</th><th>Statut</th>
            </tr>
          </thead>
          <tbody>
            @if (!filtered().length) {
              <tr><td colspan="7" class="empty">Aucun résultat</td></tr>
            } @else {
              @for (o of filtered(); track o.id) {
                <tr [style.background]="isLivraisonDefDelayed(o) ? '#fef2f2' : null" (click)="openDetail(o.id)">
                  <td class="td-id">{{ o.id }}</td>
                  <td style="font-weight: 600">{{ o.franchise }}</td>
                  <td class="td-ref">{{ o.reference }}</td>
                  <td style="color: var(--muted)">{{ o.surface || '—' }}</td>
                  <td style="color: var(--muted); white-space: nowrap">{{ o.site }}</td>
                  <td style="white-space: nowrap">
                    @if (isLivraisonDefDelayed(o)) {
                      <span style="color: #dc2626; font-weight: 700">⚠️ {{ o.livraison_definitive | date: 'dd/MM/yyyy' }}</span>
                    } @else {
                      {{ o.livraison || '—' }}
                    }
                  </td>
                  <td>
                    <app-ossature-badge [statut]="o.statut" />
                    <app-ossature-order-tags [order]="o" />
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: `.year-select { border: 1.5px solid var(--border); border-radius: 10px; padding: 7px 14px; font-size: 13px; font-family: inherit; background: #fff; font-weight: 600; color: var(--text); }`,
})
export class OssatureCoordComponent {
  private readonly data = inject(OssatureDataService);
  private readonly modals = inject(OssatureModalService);
  private readonly factory = inject(FactoryService);
  private readonly agencies = inject(AgencyService);

  readonly statuts = STATUTS;
  readonly factoryCount = computed(() => this.factory.factories().length);
  readonly franchiseCount = computed(() => this.agencies.agencies().length);
  readonly franchises = computed(() => {
    this.agencies.agencies();
    return this.agencies.getNames();
  });
  readonly sites = computed(() =>
    this.factory.mergeOssatureSites(...this.data.orders().map((o) => o.site)),
  );
  readonly currentYear = new Date().getFullYear();
  readonly selectedYear = signal(this.currentYear);
  readonly filterFranchise = signal('');
  readonly filterSite = signal('');
  readonly filterStatut = signal('');

  readonly years = computed(() => this.data.availableYears());

  readonly active = computed(() => this.data.activeOrders(this.selectedYear()));

  readonly filtered = computed(() =>
    this.active().filter(
      (o) =>
        (!this.filterFranchise() || this.agencies.orderMatchesFranchise(o.franchise, this.filterFranchise())) &&
        (!this.filterSite() || o.site === this.filterSite()) &&
        (!this.filterStatut() || o.statut === this.filterStatut()),
    ),
  );

  readonly m2Stats = computed(() => {
    const list = this.active();
    const m2Total = list.reduce((acc, o) => acc + parseSurface(o.surface), 0);
    const livrees = list.filter((o) => o.statut === 'Expédition validée');
    const m2Livrees = livrees.reduce((acc, o) => acc + parseSurface(o.surface), 0);
    return { nbCmd: list.length, m2Total: m2Total.toFixed(0), nbLivrees: livrees.length, m2Livrees: m2Livrees.toFixed(0) };
  });

  readonly siteChips = computed(() =>
    this.sites().map((site) => {
      const siteOrders = this.active().filter((o) => o.site === site);
      const hasDelay = siteOrders.some((o) => isLivraisonDefDelayed(o));
      return { site, count: siteOrders.length, hasDelay };
    }),
  );

  readonly isLivraisonDefDelayed = isLivraisonDefDelayed;

  statutStyle(s: string) {
    return STATUT_STYLE[s] ?? { dot: '#6b7280' };
  }

  statutLabel(s: string) {
    return s === 'Devis envoyé' ? 'Devis reçu' : s;
  }

  statCount(s: string): number {
    return this.active().filter((o) => o.statut === s).length;
  }

  filterBySite(site: string): void {
    this.filterSite.set(site);
    this.filterFranchise.set('');
    this.filterStatut.set('');
  }

  openDetail(id: string): void {
    this.modals.openDetail(id);
  }
}
