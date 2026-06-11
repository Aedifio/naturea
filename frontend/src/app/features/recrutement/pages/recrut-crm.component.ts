import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES } from '../recrutement.models';
import { RecrutBadgeComponent } from '../components/recrut-badge.component';
import { RecrutPctBarComponent } from '../components/recrut-pct-bar.component';
import { RecrutStarsComponent } from '../components/recrut-stars.component';
import { RecrutTopbarComponent } from '../components/recrut-topbar.component';
import { RecrutementDataService } from '../services/recrutement-data.service';

@Component({
  selector: 'app-recrut-crm',
  standalone: true,
  imports: [RouterLink, RecrutTopbarComponent, RecrutBadgeComponent, RecrutStarsComponent, RecrutPctBarComponent],
  template: `
    <app-recrut-topbar title="CRM Candidats" subtitle="Gérez et suivez vos candidats">
      <a routerLink="/apps/recrutement/nouveau" class="btn btn-primary">+ Nouveau candidat</a>
    </app-recrut-topbar>

    <div class="content">
      <div style="display:flex;gap:12px;margin-bottom:20px">
        <input
          type="text"
          [value]="search()"
          (input)="onSearch($event)"
          placeholder="🔍 Rechercher…"
          style="flex:1;padding:9px 14px;border:1.5px solid var(--border);border-radius:8px;font-family:'Archivo',sans-serif;font-size:14px;background:#fff"
        />
        <select
          [value]="statusFilter()"
          (change)="onStatus($event)"
          style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'Archivo',sans-serif;font-size:13px;background:#fff"
        >
          <option value="">Tous statuts</option>
          @for (st of statuses; track st) {
            <option [value]="st">{{ st }}</option>
          }
        </select>
        <select
          [value]="sourceFilter()"
          (change)="onSource($event)"
          style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'Archivo',sans-serif;font-size:13px;background:#fff"
        >
          <option value="">Toutes sources</option>
          @for (src of sources; track src) {
            <option [value]="src">{{ src }}</option>
          }
        </select>
        <select
          [value]="archiveFilter()"
          (change)="onArchive($event)"
          style="padding:9px 12px;border:1.5px solid var(--border);border-radius:8px;font-family:'Archivo',sans-serif;font-size:13px;background:#fff"
        >
          <option value="active">Actifs</option>
          <option value="archived">Archivés</option>
          <option value="all">Tous</option>
        </select>
      </div>

      <div class="card">
        <table>
          <thead>
            <tr>
              <th>Candidat</th>
              <th>Téléphone</th>
              <th>Email</th>
              <th>Source</th>
              <th>Statut</th>
              <th>Note</th>
              <th>Progression</th>
            </tr>
          </thead>
          <tbody>
            @if (!filtered().length) {
              <tr>
                <td colspan="7">
                  <div class="empty">
                    <div class="ei">👥</div>
                    <p>Aucun candidat</p>
                  </div>
                </td>
              </tr>
            } @else {
              @for (c of filtered(); track c.id) {
                <tr [routerLink]="['/apps/recrutement/candidat', c.id]">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px">
                      <div class="av" style="width:34px;height:34px;font-size:13px">{{ data.initials(c.prenom, c.nom) }}</div>
                      <div>
                        <strong>{{ c.prenom }} {{ c.nom }}</strong>
                        @if (c.archived) {
                          <span style="font-size:10px;background:#e5e7eb;color:#6b7280;padding:2px 7px;border-radius:10px;margin-left:6px">archivé</span>
                        }
                        <br />
                        <span style="font-size:11.5px;color:var(--muted)">{{ c.ville || '' }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ c.tel || '—' }}</td>
                  <td style="font-size:12.5px">{{ c.email || '—' }}</td>
                  <td><span class="chip">{{ c.source || '—' }}</span></td>
                  <td><app-recrut-badge [statut]="c.statut" /></td>
                  <td><app-recrut-stars [rating]="c.stars || 0" [readonly]="true" /></td>
                  <td style="min-width:110px"><app-recrut-pct-bar [candidate]="c" /></td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
})
export class RecrutCrmComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  readonly data = inject(RecrutementDataService);
  readonly statuses = CANDIDATE_STATUSES;
  readonly sources = [...CANDIDATE_SOURCES];

  readonly search = signal('');
  readonly statusFilter = signal('');
  readonly sourceFilter = signal('');
  readonly archiveFilter = signal<'active' | 'archived' | 'all'>('active');

  ngOnInit(): void {
    const view = this.route.snapshot.queryParamMap.get('view');
    if (view === 'archived') this.archiveFilter.set('archived');
  }

  readonly filtered = computed(() => {
    const q = this.search().toLowerCase().trim();
    const st = this.statusFilter();
    const src = this.sourceFilter();
    const archive = this.archiveFilter();
    return [...this.data.candidates()]
      .reverse()
      .filter((c) => {
        const haystack = `${c.prenom} ${c.nom} ${c.email || ''} ${c.ville || ''}`.toLowerCase();
        const match = !q || haystack.includes(q);
        const archiveMatch =
          archive === 'all' ||
          (archive === 'active' && !c.archived) ||
          (archive === 'archived' && !!c.archived);
        return match && archiveMatch && (!st || c.statut === st) && (!src || c.source === src);
      });
  });

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onStatus(event: Event): void {
    this.statusFilter.set((event.target as HTMLSelectElement).value);
  }

  onSource(event: Event): void {
    this.sourceFilter.set((event.target as HTMLSelectElement).value);
  }

  onArchive(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'active' || value === 'archived' || value === 'all') {
      this.archiveFilter.set(value);
    }
  }
}
