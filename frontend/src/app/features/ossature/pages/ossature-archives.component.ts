import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FactoryService } from '../../../core/services/factory.service';
import { AgencyService } from '../../../core/services/agency.service';
import { OssatureDataService } from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';

@Component({
  selector: 'app-ossature-archives',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <div>
        <div class="page-title">Archives</div>
        <div class="page-sub">{{ archived().length }} commande{{ archived().length > 1 ? 's' : '' }} archivée{{ archived().length > 1 ? 's' : '' }}</div>
      </div>
    </div>

    <div class="filters">
      <input type="text" placeholder="🔍 Rechercher…" [ngModel]="search()" (ngModelChange)="search.set($event)" />
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
    </div>

    <div class="stats-row">
      <div class="stat-card" style="border-left-color: #6b7280">
        <div class="stat-val" style="color: #6b7280">{{ archived().length }}</div>
        <div class="stat-label">Total archivées</div>
      </div>
      <div class="stat-card" style="border-left-color: #3b6fe8">
        <div class="stat-val" style="color: #3b6fe8">{{ thisMonthCount() }}</div>
        <div class="stat-label">Ce mois</div>
      </div>
    </div>

    <div class="table-wrap">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Franchisé</th><th>Référence</th><th>Surface murs</th><th>Site</th><th>Archivé le</th><th>Livraison définitive</th>
            </tr>
          </thead>
          <tbody>
            @if (!filtered().length) {
              <tr><td colspan="7" class="empty">Aucune commande archivée</td></tr>
            } @else {
              @for (o of filtered(); track o.id) {
                <tr style="opacity: 0.85" (click)="modals.openDetail(o.id)">
                  <td class="td-id">{{ o.id }}</td>
                  <td style="font-weight: 600">{{ o.franchise }}</td>
                  <td class="td-ref">{{ o.reference }}</td>
                  <td style="color: var(--muted)">{{ o.surface || '—' }}</td>
                  <td style="color: var(--muted)">{{ o.site }}</td>
                  <td style="color: var(--muted)">{{ o.archived_date || '—' }}</td>
                  <td style="color: var(--muted); font-weight: 600">
                    {{ o.livraison_definitive ? (o.livraison_definitive | date: 'dd/MM/yyyy') : '—' }}
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class OssatureArchivesComponent {
  readonly data = inject(OssatureDataService);
  readonly modals = inject(OssatureModalService);
  private readonly factory = inject(FactoryService);
  private readonly agencies = inject(AgencyService);

  readonly franchises = computed(() => {
    this.agencies.agencies();
    return this.agencies.getNames();
  });
  readonly sites = computed(() =>
    this.factory.mergeOssatureSites(...this.data.orders().map((o) => o.site)),
  );

  readonly search = signal('');
  readonly filterFranchise = signal('');
  readonly filterSite = signal('');

  readonly archived = computed(() => this.data.archivedOrders());

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase();
    return this.archived().filter(
      (o) =>
        (!this.filterFranchise() || this.agencies.orderMatchesFranchise(o.franchise, this.filterFranchise())) &&
        (!this.filterSite() || o.site === this.filterSite()) &&
        (!q || o.reference.toLowerCase().includes(q) || o.franchise.toLowerCase().includes(q)),
    );
  });

  thisMonthCount(): number {
    const month = new Date().toISOString().slice(0, 7);
    return this.archived().filter((o) => o.archived_date?.slice(0, 7) === month).length;
  }
}
