import { Injectable, computed, inject, signal } from '@angular/core';
import { DOC_CATS } from '../constants/recrutement-doc.constants';
import { Candidate, DiscResult, QuestionnaireData, StoredDocument } from '../recrutement.models';
import { StorageKey } from '../../../core/models/storage-keys';
import { StorageService } from '../../../core/storage/storage.service';

export const ALL_DOC_KEYS = DOC_CATS.flatMap((c) => c.docs.map((d) => d.k));
export const TOTAL_DOCS = ALL_DOC_KEYS.length;

export const RECRUTEMENT_SEED: Candidate[] = [
  {
    id: 'd1',
    prenom: 'Jean',
    nom: 'Dupont',
    email: 'jean.dupont@email.com',
    password: 'candidat123',
    tel: '06 12 34 56 78',
    ville: 'Lyon',
    cp: '69001',
    budget: '65000',
    zone: 'Auvergne-Rhône-Alpes',
    source: 'LinkedIn',
    statut: 'RDV planifié',
    stars: 4,
    date: '15/04/2026',
    notes: '8 ans en grande distribution. Très motivé.',
    documents: {},
    disc: null,
    questionnaire: null,
  },
  {
    id: 'd2',
    prenom: 'Marie',
    nom: 'Martin',
    email: 'marie.martin@email.com',
    password: 'candidat456',
    tel: '07 23 45 67 89',
    ville: 'Bordeaux',
    cp: '33000',
    budget: '80000',
    zone: 'Nouvelle-Aquitaine',
    source: 'Salon franchise',
    statut: 'Qualifié',
    stars: 5,
    date: '10/04/2026',
    notes: 'Ancienne responsable réseau. Profil prioritaire.',
    documents: {
      cv: { name: 'cv_marie_martin.pdf', dataUrl: null, type: 'application/pdf' },
    },
    disc: null,
    questionnaire: null,
  },
];

const STATUS_BADGE: Record<string, string> = {
  Nouveau: 'b-new',
  'Contact établi': 'b-contact',
  'RDV planifié': 'b-rdv',
  'Recrutement en cours': 'b-recr',
  Qualifié: 'b-ok',
  Refusé: 'b-no',
};

@Injectable({ providedIn: 'root' })
export class RecrutementDataService {
  private readonly storage = inject(StorageService);
  private readonly _version = signal(0);

  readonly candidates = computed(() => {
    this._version();
    return this.storage.get<Candidate[]>(StorageKey.Recrutement) ?? [];
  });

  readonly dashboardStats = computed(() => {
    const list = this.candidates();
    return {
      total: list.length,
      nouveaux: list.filter((c) => c.statut === 'Nouveau').length,
      rdv: list.filter((c) => c.statut === 'RDV planifié').length,
      qualifies: list.filter((c) => c.statut === 'Qualifié').length,
    };
  });

  bump(): void {
    this._version.update((v) => v + 1);
  }

  save(list: Candidate[]): void {
    this.storage.set(StorageKey.Recrutement, list);
    this.bump();
  }

  getById(id: string): Candidate | undefined {
    return this.candidates().find((c) => c.id === id);
  }

  updateCandidate(id: string, patch: Partial<Candidate>): void {
    const list = this.candidates().map((c) => (c.id === id ? { ...c, ...patch } : c));
    this.save(list);
  }

  addCandidate(candidate: Candidate): void {
    this.save([...this.candidates(), candidate]);
  }

  setDocument(candidateId: string, key: string, doc: StoredDocument): void {
    const list = this.candidates().map((c) => {
      if (c.id !== candidateId) return c;
      return { ...c, documents: { ...c.documents, [key]: doc } };
    });
    this.save(list);
  }

  deleteDocument(candidateId: string, key: string): void {
    const list = this.candidates().map((c) => {
      if (c.id !== candidateId) return c;
      const documents = { ...c.documents };
      delete documents[key];
      return { ...c, documents };
    });
    this.save(list);
  }

  setDisc(candidateId: string, disc: DiscResult): void {
    this.updateCandidate(candidateId, { disc });
  }

  setQuestionnaire(candidateId: string, questionnaire: QuestionnaireData): void {
    this.updateCandidate(candidateId, { questionnaire });
  }

  initials(prenom?: string, nom?: string): string {
    return ((prenom || '?')[0] + (nom || '?')[0]).toUpperCase();
  }

  statusBadgeClass(statut: string): string {
    return STATUS_BADGE[statut] ?? 'b-new';
  }

  starsFilled(count: number): boolean[] {
    return [1, 2, 3, 4, 5].map((i) => i <= count);
  }

  docCount(candidate: Candidate): number {
    return Object.keys(candidate.documents ?? {}).length;
  }

  progressPercent(candidate: Candidate): number {
    return Math.round((this.docCount(candidate) / TOTAL_DOCS) * 100);
  }

  progressColor(candidate: Candidate): string {
    const p = this.progressPercent(candidate);
    if (p >= 80) return 'var(--green)';
    if (p >= 40) return 'var(--gold)';
    return '#ccc';
  }

  uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  now(): string {
    return new Date().toLocaleDateString('fr-FR');
  }

  emailTaken(email: string, excludeId?: string): boolean {
    const normalized = email.trim().toLowerCase();
    return this.candidates().some(
      (c) => c.email.toLowerCase() === normalized && c.id !== excludeId,
    );
  }
}
