import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CANDIDATE_SOURCES, CANDIDATE_STATUSES } from '../recrutement.models';
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
    FormsModule,
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
        @if (c.archived) {
          <button type="button" class="btn btn-outline btn-sm" (click)="unarchive()">📂 Désarchiver</button>
        } @else {
          <button type="button" class="btn btn-danger btn-sm" (click)="archive()">📦 Archiver</button>
        }
        <button type="button" class="btn btn-primary btn-sm" [disabled]="saving()" (click)="save()">
          {{ saving() ? 'Sauvegarde…' : '💾 Sauvegarder' }}
        </button>
      </app-recrut-topbar>

      <div class="content">
        @if (c.archived) {
          <div style="background:#f3f4f6;border:1px solid #d1d5db;border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:13.5px;color:#4b5563">
            📦 Candidat archivé@if (c.archivedAt) { — le {{ formatDate(c.archivedAt) }} }
          </div>
        }

        <div class="tabs">
          <div class="tab" [class.active]="tab() === 'profil'" (click)="tab.set('profil')">👤 Profil</div>
          <div class="tab" [class.active]="tab() === 'documents'" (click)="tab.set('documents')">📁 Documents</div>
        </div>

        @if (tab() === 'profil') {
          <div class="tc active">
            <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:24px">
              <div class="av">{{ data.initials(form.prenom, form.nom) }}</div>
              <div style="flex:1">
                <h2 style="font-family:'Archivo Black','Archivo',sans-serif;font-size:28px;color:var(--ink)">
                  {{ form.prenom || c.prenom }} {{ form.nom || c.nom }}
                </h2>
                <div style="display:flex;align-items:center;gap:14px;margin-top:8px;flex-wrap:wrap">
                  <app-recrut-stars [rating]="stars()" (ratingChange)="stars.set($event)" />
                  <app-recrut-badge [statut]="form.statut" />
                  <select [(ngModel)]="form.statut" style="font-size:13px;padding:5px 10px;border-radius:6px;border:1.5px solid var(--border);font-family:'Archivo',sans-serif">
                    @for (st of statuses; track st) {
                      <option [value]="st">{{ st }}</option>
                    }
                  </select>
                </div>
              </div>
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
                <label>Email *</label>
                <input type="email" [(ngModel)]="form.email" placeholder="jean.dupont@email.com" />
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
                <input type="text" [(ngModel)]="form.budget" placeholder="50000" />
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
                <label>Inscrit le</label>
                <input type="text" [value]="data.formatCandidatureDate(c.dateCandidature)" disabled style="opacity:.7" />
              </div>
              <div class="fg full">
                <label>Notes internes</label>
                <textarea [(ngModel)]="form.notes" placeholder="Notes…"></textarea>
              </div>
            </div>

            <div class="card" style="padding:24px;margin-top:24px;max-width:760px">
              <h4 style="font-family:'Archivo Black','Archivo',sans-serif;font-size:13px;color:var(--ink);margin-bottom:4px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">
                🔐 Accès candidat
              </h4>
              <p style="font-size:13px;color:var(--muted);margin-bottom:18px">
                @if (c.hasPortalAccount) {
                  Compte portail lié — le candidat peut se connecter avec son email et le mot de passe défini ci-dessous.
                } @else {
                  Aucun compte portail — définir un mot de passe créera un utilisateur « Candidat franchise » pour la connexion.
                }
              </p>
              <div class="fgrid">
                <div class="fg">
                  <label>Nouveau mot de passe</label>
                  <input type="password" [(ngModel)]="passwordForm.password" placeholder="Min. 6 caractères" autocomplete="new-password" />
                </div>
                <div class="fg">
                  <label>Confirmer le mot de passe</label>
                  <input type="password" [(ngModel)]="passwordForm.confirm" placeholder="Retaper le mot de passe" autocomplete="new-password" />
                </div>
              </div>
              <button
                type="button"
                class="btn btn-outline btn-sm"
                [disabled]="settingPassword()"
                (click)="setPassword()"
              >
                {{ settingPassword() ? 'Mise à jour…' : '🔑 Définir le mot de passe' }}
              </button>
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
  private readonly router = inject(Router);
  private readonly toast = inject(RecrutementToastService);
  readonly data = inject(RecrutementDataService);
  readonly statuses = CANDIDATE_STATUSES;
  readonly sources = CANDIDATE_SOURCES;

  readonly tab = signal<'profil' | 'documents'>('profil');
  readonly saving = signal(false);
  readonly settingPassword = signal(false);
  readonly candidateId = computed(() => this.route.snapshot.paramMap.get('id') ?? '');
  readonly candidate = computed(() => this.data.getById(this.candidateId()));

  readonly stars = signal(0);
  form = {
    prenom: '',
    nom: '',
    email: '',
    tel: '',
    ville: '',
    cp: '',
    budget: '',
    zone: '',
    source: '',
    statut: 'Nouveau',
    notes: '',
  };
  passwordForm = {
    password: '',
    confirm: '',
  };

  ngOnInit(): void {
    this.loadForm();
  }

  private loadForm(): void {
    const c = this.candidate();
    if (!c) return;
    this.stars.set(c.stars || 0);
    this.form = {
      prenom: c.prenom,
      nom: c.nom,
      email: c.email,
      tel: c.tel ?? '',
      ville: c.ville ?? '',
      cp: c.cp ?? '',
      budget: c.budget ?? '',
      zone: c.zone ?? '',
      source: c.source ?? '',
      statut: c.statut,
      notes: c.notes ?? '',
    };
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR');
  }

  async save(): Promise<void> {
    const id = this.candidateId();
    if (!id || this.saving()) return;

    const prenom = this.form.prenom.trim();
    const nom = this.form.nom.trim();
    const email = this.form.email.trim().toLowerCase();
    if (!prenom || !nom) {
      alert('Prénom et nom requis.');
      return;
    }
    if (!email) {
      alert('Email requis.');
      return;
    }
    if (await this.data.emailTaken(email, id)) {
      alert('Cet email est déjà utilisé.');
      return;
    }

    this.saving.set(true);
    try {
      await this.data.updateCandidate(id, {
        prenom,
        nom,
        email,
        tel: this.form.tel,
        ville: this.form.ville,
        cp: this.form.cp,
        budget: this.form.budget,
        zone: this.form.zone,
        source: this.form.source,
        statut: this.form.statut,
        stars: this.stars(),
        notes: this.form.notes,
      });
      this.toast.show('✅ Modifications sauvegardées');
    } catch {
      this.toast.show('❌ Erreur lors de la sauvegarde');
    } finally {
      this.saving.set(false);
    }
  }

  async setPassword(): Promise<void> {
    const id = this.candidateId();
    if (!id || this.settingPassword()) return;

    const password = this.passwordForm.password;
    const confirm = this.passwordForm.confirm;
    if (!password) {
      alert('Saisissez un mot de passe.');
      return;
    }
    if (password.length < 6) {
      alert('Mot de passe min. 6 caractères.');
      return;
    }
    if (password !== confirm) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }

    this.settingPassword.set(true);
    try {
      await this.data.setPassword(id, password);
      this.passwordForm = { password: '', confirm: '' };
      this.toast.show('🔑 Compte candidat mis à jour — connexion activée');
    } catch {
      this.toast.show('❌ Erreur lors de la mise à jour du mot de passe');
    } finally {
      this.settingPassword.set(false);
    }
  }

  async archive(): Promise<void> {
    const id = this.candidateId();
    if (!id) return;
    if (!confirm('Archiver ce candidat ?\nIl sera masqué du CRM actif mais restera accessible dans les archives.')) {
      return;
    }
    await this.data.archiveCandidate(id);
    this.toast.show('📦 Candidat archivé');
    void this.router.navigate(['/apps/recrutement/crm'], { queryParams: { view: 'archived' } });
  }

  async unarchive(): Promise<void> {
    const id = this.candidateId();
    if (!id) return;
    await this.data.unarchiveCandidate(id);
    this.loadForm();
    this.toast.show('📂 Candidat désarchivé');
  }
}
