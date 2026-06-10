import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AgencyService } from '../../../core/services/agency.service';
import { STATUTS, STATUT_STYLE } from '../constants/ossature.constants';
import { OssatureBadgeComponent } from '../components/ossature-badge.component';
import { OssatureOrderTagsComponent } from '../components/ossature-order-tags.component';
import { OssatureDataService, parseSurface } from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';
import { OssatureModeService } from '../services/ossature-mode.service';

@Component({
  selector: 'app-ossature-franchise',
  standalone: true,
  imports: [FormsModule, OssatureBadgeComponent, OssatureOrderTagsComponent],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Mes commandes</div>
        <div class="page-sub">{{ mode.selectedFranchise() }}</div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center">
        <select class="year-select" [ngModel]="selectedYear()" (ngModelChange)="selectedYear.set($event)">
          <option [ngValue]="currentYear">Année en cours</option>
          @for (y of years(); track y) {
            @if (y !== currentYear) {
              <option [ngValue]="y">{{ y }}</option>
            }
          }
        </select>
        <button type="button" class="btn-primary" (click)="modals.openNewOrder('franchise')">+ Nouvelle commande</button>
      </div>
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

    <div class="card-list">
      @if (!mine().length) {
        <div class="empty">Aucune commande pour ce franchisé</div>
      } @else {
        @for (o of mine(); track o.id) {
          <div class="order-card" (click)="modals.openDetail(o.id)">
            <div class="card-main">
              <div class="card-ref">{{ o.reference }}</div>
              <div class="card-sub">{{ o.id }} · {{ o.site }}</div>
            </div>
            <div class="card-meta">{{ o.surface }}</div>
            <div class="card-meta">📅 {{ o.livraison || '—' }}</div>
            <app-ossature-badge [statut]="o.statut" />
            <app-ossature-order-tags [order]="o" />
          </div>
        }
      }
    </div>
  `,
  styles: `.year-select { border: 1.5px solid var(--border); border-radius: 10px; padding: 7px 14px; font-size: 13px; font-family: inherit; background: #fff; font-weight: 600; color: var(--text); }`,
})
export class OssatureFranchiseComponent {
  readonly data = inject(OssatureDataService);
  readonly modals = inject(OssatureModalService);
  readonly mode = inject(OssatureModeService);
  private readonly agencies = inject(AgencyService);

  readonly statuts = STATUTS;
  readonly currentYear = new Date().getFullYear();
  readonly selectedYear = signal(this.currentYear);

  readonly years = computed(() =>
    [...new Set(this.data.orders().filter((o) => this.matchesFranchise(o.franchise)).map((o) => o.annee || this.currentYear))].sort(
      (a, b) => b - a,
    ),
  );

  readonly mine = computed(() =>
    this.data
      .orders()
      .filter(
        (o) =>
          this.matchesFranchise(o.franchise) &&
          !o.archived &&
          (o.annee || this.currentYear) === this.selectedYear(),
      ),
  );

  readonly m2Stats = computed(() => {
    const list = this.mine();
    const m2Total = list.reduce((acc, o) => acc + parseSurface(o.surface), 0);
    const livrees = list.filter((o) => o.statut === 'Expédition validée');
    const m2Livrees = livrees.reduce((acc, o) => acc + parseSurface(o.surface), 0);
    return { nbCmd: list.length, m2Total: m2Total.toFixed(0), nbLivrees: livrees.length, m2Livrees: m2Livrees.toFixed(0) };
  });

  statutStyle(s: string) {
    return STATUT_STYLE[s] ?? { dot: '#6b7280' };
  }

  statutLabel(s: string) {
    return s === 'Devis envoyé' ? 'Devis reçu' : s;
  }

  statCount(s: string): number {
    return this.mine().filter((o) => o.statut === s).length;
  }

  private matchesFranchise(orderFranchise: string): boolean {
    return this.agencies.orderMatchesFranchise(orderFranchise, this.mode.selectedFranchise());
  }
}
