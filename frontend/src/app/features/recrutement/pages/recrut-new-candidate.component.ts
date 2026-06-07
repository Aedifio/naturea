import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES, Candidate } from '../recrutement.models';
import { RecrutStarsComponent } from '../components/recrut-stars.component';
import { RecrutTopbarComponent } from '../components/recrut-topbar.component';
import { RecrutementDataService } from '../services/recrutement-data.service';
import { RecrutementToastService } from '../services/recrutement-toast.service';

@Component({
  selector: 'app-recrut-new-candidate',
  standalone: true,
  imports: [FormsModule, RouterLink, RecrutTopbarComponent, RecrutStarsComponent],
  template: `
    <app-recrut-topbar title="Nouveau candidat" subtitle="Créer un compte et une fiche candidat" />

    <div class="content">
      <div class="card" style="padding:32px;max-width:760px">
        <div style="background:var(--sand);border-radius:10px;padding:14px 18px;margin-bottom:24px;border-left:4px solid var(--gold);font-size:13.5px">
          🔐 <strong>Accès candidat :</strong> Le candidat pourra se connecter avec l'email et le mot de passe définis ici.
        </div>

        <div class="fgrid">
          <div class="fg">
            <label>Prénom *</label>
            <input type="text" [(ngModel)]="form.prenom" placeholder="Jean" />
          </div>
          <div class="fg">
            <label>Nom *</label>
            <input type="text" [(ngModel)]="form.nom" placeholder="Dupont" />
          </div>
          <div class="fg">
            <label>Email * (identifiant)</label>
            <input type="email" [(ngModel)]="form.email" placeholder="jean.dupont@email.com" />
          </div>
          <div class="fg">
            <label>Mot de passe candidat *</label>
            <input type="password" [(ngModel)]="form.password" placeholder="Min. 6 caractères" />
          </div>
          <div class="fg">
            <label>Téléphone</label>
            <input type="tel" [(ngModel)]="form.tel" placeholder="06 12 34 56 78" />
          </div>
          <div class="fg">
            <label>Ville</label>
            <input type="text" [(ngModel)]="form.ville" placeholder="Paris" />
          </div>
          <div class="fg">
            <label>Code postal</label>
            <input type="text" [(ngModel)]="form.cp" placeholder="75001" />
          </div>
          <div class="fg">
            <label>Budget (€)</label>
            <input type="number" [(ngModel)]="form.budget" placeholder="50000" />
          </div>
          <div class="fg">
            <label>Zone souhaitée</label>
            <input type="text" [(ngModel)]="form.zone" placeholder="Île-de-France" />
          </div>
          <div class="fg">
            <label>Source</label>
            <select [(ngModel)]="form.source">
              <option value="">Sélectionner…</option>
              @for (src of sources; track src) {
                <option [value]="src">{{ src }}</option>
              }
            </select>
          </div>
          <div class="fg">
            <label>Statut</label>
            <select [(ngModel)]="form.statut">
              @for (st of statuses; track st) {
                <option [value]="st">{{ st }}</option>
              }
            </select>
          </div>
          <div class="fg">
            <label>Note initiale</label>
            <app-recrut-stars [rating]="stars()" (ratingChange)="stars.set($event)" />
          </div>
          <div class="fg full">
            <label>Notes internes</label>
            <textarea [(ngModel)]="form.notes" placeholder="Expérience, motivations, observations…"></textarea>
          </div>
        </div>

        <div style="display:flex;gap:12px;margin-top:8px">
          <button type="button" class="btn btn-primary" (click)="save()">💾 Créer le compte candidat</button>
          <a routerLink="/apps/recrutement/crm" class="btn btn-outline">Annuler</a>
        </div>
      </div>
    </div>
  `,
})
export class RecrutNewCandidateComponent {
  private readonly data = inject(RecrutementDataService);
  private readonly toast = inject(RecrutementToastService);
  private readonly router = inject(Router);

  readonly statuses = CANDIDATE_STATUSES;
  readonly sources = CANDIDATE_SOURCES;

  readonly stars = signal(0);
  form = {
    prenom: '',
    nom: '',
    email: '',
    password: '',
    tel: '',
    ville: '',
    cp: '',
    budget: '',
    zone: '',
    source: '',
    statut: 'Nouveau',
    notes: '',
  };

  save(): void {
    const prenom = this.form.prenom.trim();
    const nom = this.form.nom.trim();
    const email = this.form.email.trim().toLowerCase();
    const password = this.form.password;
    if (!prenom || !nom) {
      alert('Prénom et nom requis.');
      return;
    }
    if (!email || !password) {
      alert('Email et mot de passe requis.');
      return;
    }
    if (password.length < 6) {
      alert('Mot de passe min. 6 caractères.');
      return;
    }
    if (this.data.emailTaken(email)) {
      alert('Cet email est déjà utilisé.');
      return;
    }

    const candidate: Candidate = {
      id: this.data.uid(),
      prenom,
      nom,
      email,
      password,
      tel: this.form.tel,
      ville: this.form.ville,
      cp: this.form.cp,
      budget: this.form.budget,
      zone: this.form.zone,
      source: this.form.source,
      statut: this.form.statut,
      stars: this.stars(),
      notes: this.form.notes,
      date: this.data.now(),
      documents: {},
      disc: null,
      questionnaire: null,
    };
    this.data.addCandidate(candidate);
    this.toast.show(`✅ Compte candidat créé — ${email}`);
    void this.router.navigate(['/apps/recrutement/crm']);
  }
}
