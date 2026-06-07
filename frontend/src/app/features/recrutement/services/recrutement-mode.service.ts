import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RecrutSession } from '../recrutement.models';
import { RecrutementDataService } from './recrutement-data.service';
import { RecrutementToastService } from './recrutement-toast.service';

@Injectable({ providedIn: 'root' })
export class RecrutementModeService {
  private readonly router = inject(Router);
  private readonly data = inject(RecrutementDataService);
  private readonly toast = inject(RecrutementToastService);

  private readonly _session = signal<RecrutSession | null>(null);
  private readonly _franchisorSession = signal(false);
  readonly pickerOpen = signal(false);

  readonly session = this._session.asReadonly();
  readonly franchisorSession = this._franchisorSession.asReadonly();

  readonly isAdmin = computed(() => this._session()?.role === 'admin');
  readonly isCandidate = computed(() => this._session()?.role === 'candidate');
  readonly showSwitchButton = computed(() => this._franchisorSession());

  readonly switchLabel = computed(() =>
    this.isCandidate() ? '⇄ Revenir vue franchiseur' : '⇄ Changer de vue',
  );

  setAdminMode(): void {
    this._session.set({
      role: 'admin',
      email: 'admin@maisons-naturea.fr',
      name: 'Franchiseur',
    });
    this._franchisorSession.set(true);
  }

  setCandidateMode(candidateId: string, asFranchisor = false): void {
    const candidate = this.data.getById(candidateId);
    if (!candidate) return;
    this._session.set({
      role: 'candidate',
      email: candidate.email,
      name: `${candidate.prenom} ${candidate.nom}`,
      id: candidate.id,
    });
    this._franchisorSession.set(asFranchisor);
    void this.router.navigate(['/apps/recrutement/espace']);
  }

  switchToCandidate(): void {
    if (!this.data.candidates().length) {
      this.toast.show('Aucun candidat dans la base');
      return;
    }
    this.pickerOpen.set(true);
  }

  backToAdmin(): void {
    this.setAdminMode();
    void this.router.navigate(['/apps/recrutement']);
  }

  handleSwitch(): void {
    if (!this._franchisorSession()) return;
    if (this.isCandidate()) {
      this.backToAdmin();
    } else {
      this.switchToCandidate();
    }
  }

  closePicker(): void {
    this.pickerOpen.set(false);
  }

  pickCandidate(id: string): void {
    this.closePicker();
    this.setCandidateMode(id, true);
  }

  currentCandidateId(): string | null {
    const session = this._session();
    return session?.role === 'candidate' ? session.id : null;
  }
}
