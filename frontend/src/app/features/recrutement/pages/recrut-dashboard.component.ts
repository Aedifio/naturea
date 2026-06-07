import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecrutBadgeComponent } from '../components/recrut-badge.component';
import { RecrutPctBarComponent } from '../components/recrut-pct-bar.component';
import { RecrutStarsComponent } from '../components/recrut-stars.component';
import { RecrutTopbarComponent } from '../components/recrut-topbar.component';
import { RecrutementDataService } from '../services/recrutement-data.service';

@Component({
  selector: 'app-recrut-dashboard',
  standalone: true,
  imports: [RouterLink, RecrutTopbarComponent, RecrutBadgeComponent, RecrutStarsComponent, RecrutPctBarComponent],
  template: `
    <app-recrut-topbar title="Vue d'ensemble" subtitle="Tableau de bord franchiseur">
      <a routerLink="/apps/recrutement/nouveau" class="btn btn-primary">+ Nouveau candidat</a>
    </app-recrut-topbar>

    <div class="content">
      <div class="stats-grid">
        <div class="stat">
          <div class="stat-n">{{ stats().total }}</div>
          <div class="stat-l">Total candidats</div>
        </div>
        <div class="stat">
          <div class="stat-n" style="color:var(--gold)">{{ stats().nouveaux }}</div>
          <div class="stat-l">Nouveaux</div>
        </div>
        <div class="stat">
          <div class="stat-n" style="color:var(--green)">{{ stats().rdv }}</div>
          <div class="stat-l">RDV planifiés</div>
        </div>
        <div class="stat">
          <div class="stat-n" style="color:var(--purple)">{{ stats().qualifies }}</div>
          <div class="stat-l">Qualifiés</div>
        </div>
      </div>

      <div class="card">
        <div class="card-hd">
          <h3>Derniers candidats</h3>
          <a routerLink="/apps/recrutement/crm" class="btn btn-outline btn-sm">Voir tout</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Candidat</th>
              <th>Source</th>
              <th>Statut</th>
              <th>Note</th>
              <th>Progression dossier</th>
            </tr>
          </thead>
          <tbody>
            @if (!recent().length) {
              <tr>
                <td colspan="5">
                  <div class="empty">
                    <div class="ei">👥</div>
                    <p>Aucun candidat</p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (c of recent(); track c.id) {
                <tr [routerLink]="['/apps/recrutement/candidat', c.id]">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="av" style="width:34px;height:34px;font-size:13px">{{ data.initials(c.prenom, c.nom) }}</div>
                      <strong>{{ c.prenom }} {{ c.nom }}</strong>
                    </div>
                  </td>
                  <td><span class="chip">{{ c.source || '—' }}</span></td>
                  <td><app-recrut-badge [statut]="c.statut" /></td>
                  <td><app-recrut-stars [rating]="c.stars || 0" [readonly]="true" /></td>
                  <td style="min-width:130px"><app-recrut-pct-bar [candidate]="c" /></td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class RecrutDashboardComponent {
  readonly data = inject(RecrutementDataService);
  readonly stats = this.data.dashboardStats;
  readonly recent = computed(() => [...this.data.candidates()].reverse().slice(0, 8));
}
