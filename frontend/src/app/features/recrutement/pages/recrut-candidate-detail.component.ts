import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CANDIDATE_STATUSES } from '../recrutement.models';
import { RecrutBadgeComponent } from '../components/recrut-badge.component';
import { RecrutDocListComponent } from '../components/recrut-doc-list.component';
import { RecrutStarsComponent } from '../components/recrut-stars.component';
import { RecrutTopbarComponent } from '../components/recrut-topbar.component';
import { RecrutementDataService } from '../services/recrutement-data.service';
import { RecrutementToastService } from '../services/recrutement-toast.service';

@Component({
  selector: 'app-recrut-candidate-detail',
  standalone: true,
  imports: [
    RouterLink,
    RecrutTopbarComponent,
    RecrutBadgeComponent,
    RecrutStarsComponent,
    RecrutDocListComponent,
  ],
  template: `
    @if (candidate(); as c) {
      <app-recrut-topbar [title]="c.prenom + ' ' + c.nom" subtitle="Dossier complet">
        <a routerLink="/apps/recrutement/crm" class="btn btn-outline btn-sm">← Retour</a>
        <button type="button" class="btn btn-primary btn-sm" (click)="save()">💾 Sauvegarder</button>
      </app-recrut-topbar>

      <div class="content">
        <div class="tabs">
          <div class="tab" [class.active]="tab() === 'profil'" (click)="tab.set('profil')">👤 Profil</div>
          <div class="tab" [class.active]="tab() === 'documents'" (click)="tab.set('documents')">📁 Documents</div>
        </div>

        @if (tab() === 'profil') {
          <div class="tc active">
            <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:24px">
              <div class="av">{{ data.initials(c.prenom, c.nom) }}</div>
              <div style="flex:1">
                <h2 style="font-family:'Archivo Black','Archivo',sans-serif;font-size:28px;color:var(--ink)">
                  {{ c.prenom }} {{ c.nom }}
                </h2>
                <div style="display:flex;align-items:center;gap:14px;margin-top:8px;flex-wrap:wrap">
                  <app-recrut-stars [rating]="stars()" (ratingChange)="onStars($event)" />
                  <app-recrut-badge [statut]="statut()" />
                  <select [value]="statut()" (change)="onStatut($event)" style="font-size:13px;padding:5px 10px;border-radius:6px;border:1.5px solid var(--border);font-family:'Archivo',sans-serif">
                    @for (st of statuses; track st) {
                      <option [value]="st">{{ st }}</option>
                    }
                  </select>
                </div>
              </div>
            </div>

            <div class="pgrid">
              <div class="pcard">
                <h4>📞 Coordonnées</h4>
                <div class="ir"><span class="il">Email</span><span>{{ c.email || '—' }}</span></div>
                <div class="ir"><span class="il">Téléphone</span><span>{{ c.tel || '—' }}</span></div>
                <div class="ir"><span class="il">Ville</span><span>{{ c.ville || '—' }}</span></div>
                <div class="ir"><span class="il">Code postal</span><span>{{ c.cp || '—' }}</span></div>
              </div>
              <div class="pcard">
                <h4>📌 Qualification</h4>
                <div class="ir"><span class="il">Source</span><span>{{ c.source || '—' }}</span></div>
                <div class="ir"><span class="il">Budget</span><span>{{ c.budget ? c.budget + ' €' : '—' }}</span></div>
                <div class="ir"><span class="il">Zone</span><span>{{ c.zone || '—' }}</span></div>
                <div class="ir"><span class="il">Inscrit le</span><span>{{ c.date || '—' }}</span></div>
              </div>
              <div class="pcard" style="grid-column:1/-1">
                <h4>📝 Notes internes</h4>
                <textarea
                  [value]="notes()"
                  (input)="onNotes($event)"
                  style="width:100%;min-height:90px;border:none;background:transparent;font-family:'Archivo',sans-serif;font-size:13.5px;color:var(--text);resize:vertical;padding:4px 0"
                  placeholder="Notes…"
                ></textarea>
              </div>
            </div>
          </div>
        } @else {
          <div class="tc active">
            <app-recrut-doc-list [candidateId]="c.id" />
          </div>
        }
      </div>
    }
  `,
})
export class RecrutCandidateDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(RecrutementToastService);
  readonly data = inject(RecrutementDataService);
  readonly statuses = CANDIDATE_STATUSES;

  readonly tab = signal<'profil' | 'documents'>('profil');
  readonly candidateId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');
  readonly candidate = computed(() => this.data.getById(this.candidateId()));

  readonly stars = signal(0);
  readonly statut = signal('Nouveau');
  readonly notes = signal('');

  ngOnInit(): void {
    const c = this.candidate();
    if (!c) return;
    this.stars.set(c.stars || 0);
    this.statut.set(c.statut);
    this.notes.set(c.notes || '');
  }

  onStars(value: number): void {
    this.stars.set(value);
    const id = this.candidateId();
    if (id) this.data.updateCandidate(id, { stars: value });
  }

  onStatut(event: Event): void {
    this.statut.set((event.target as HTMLSelectElement).value);
  }

  onNotes(event: Event): void {
    this.notes.set((event.target as HTMLTextAreaElement).value);
  }

  save(): void {
    const id = this.candidateId();
    if (!id) return;
    this.data.updateCandidate(id, { notes: this.notes(), statut: this.statut() });
    this.toast.show('✅ Modifications sauvegardées');
  }
}
