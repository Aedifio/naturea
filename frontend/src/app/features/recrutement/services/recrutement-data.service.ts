import { Injectable, computed, inject, signal } from '@angular/core';
import { DOC_CATS } from '../constants/recrutement-doc.constants';
import { Candidate, DiscResult, QuestionnaireData, StoredDocument } from '../recrutement.models';
import { FileStorageService } from '../../../core/storage/file-storage.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';

export const ALL_DOC_KEYS = DOC_CATS.flatMap((c) => c.docs.map((d) => d.k));
export const TOTAL_DOCS = ALL_DOC_KEYS.length;

const STATUS_BADGE: Record<string, string> = {
  Nouveau: 'b-new',
  'Contact établi': 'b-contact',
  'RDV planifié': 'b-rdv',
  'Recrutement en cours': 'b-recr',
  Qualifié: 'b-ok',
  Refusé: 'b-no',
};

interface CandidatRow {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  tel: string | null;
  ville: string | null;
  cp: string | null;
  budget: string | null;
  zone: string | null;
  source: string | null;
  statut: string;
  stars: number | null;
  date_label: string | null;
  notes: string | null;
  documents: Record<string, StoredDocument>;
  disc: DiscResult | null;
  questionnaire: QuestionnaireData | null;
}

@Injectable({ providedIn: 'root' })
export class RecrutementDataService {
  private readonly supabase = inject(SupabaseService);
  private readonly files = inject(FileStorageService);
  private readonly _candidates = signal<Candidate[]>([]);

  readonly candidates = computed(() => this._candidates());

  readonly dashboardStats = computed(() => {
    const list = this._candidates();
    return {
      total: list.length,
      nouveaux: list.filter((c) => c.statut === 'Nouveau').length,
      rdv: list.filter((c) => c.statut === 'RDV planifié').length,
      qualifies: list.filter((c) => c.statut === 'Qualifié').length,
    };
  });

  async load(): Promise<void> {
    const { data, error } = await this.supabase
      .from('recrutement_candidats')
      .select('*')
      .order('date_label', { ascending: false });
    if (error) {
      console.error('[Recrutement] load failed', error);
      return;
    }
    this._candidates.set((data as CandidatRow[] ?? []).map((r) => this.rowToCandidate(r)));
  }

  async save(list: Candidate[]): Promise<void> {
    const rows = list.map((c) => this.candidateToRow(c));
    const { error } = await this.supabase.from('recrutement_candidats').upsert(rows);
    if (error) throw error;
    this._candidates.set(list);
  }

  getById(id: string): Candidate | undefined {
    return this._candidates().find((c) => c.id === id);
  }

  async updateCandidate(id: string, patch: Partial<Candidate>): Promise<void> {
    const list = this._candidates().map((c) => (c.id === id ? { ...c, ...patch } : c));
    await this.save(list);
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    const { error } = await this.supabase.from('recrutement_candidats').insert(this.candidateToRow(candidate));
    if (error) throw error;
    await this.load();
  }

  async setDocument(candidateId: string, key: string, doc: StoredDocument): Promise<void> {
    const c = this.getById(candidateId);
    if (!c) return;
    await this.updateCandidate(candidateId, {
      documents: { ...c.documents, [key]: doc },
    });
  }

  async uploadDocument(candidateId: string, key: string, file: File): Promise<void> {
    const path = `${candidateId}/${key}/${Date.now()}-${file.name}`;
    const uploaded = await this.files.upload('recrutement', path, file, {
      appSlot: 'RECRUT',
      entityType: 'candidat',
      entityId: candidateId,
      kind: key,
    });
    await this.setDocument(candidateId, key, {
      name: file.name,
      type: file.type,
      dataUrl: uploaded.signedUrl,
      storagePath: uploaded.path,
      storageBucket: uploaded.bucket,
    });
  }

  async resolveDocumentUrl(doc: StoredDocument): Promise<string | null> {
    if (doc.dataUrl) return doc.dataUrl;
    if (doc.storagePath && doc.storageBucket) {
      return this.files.getSignedUrl(doc.storageBucket as 'recrutement', doc.storagePath);
    }
    return null;
  }

  async deleteDocument(candidateId: string, key: string): Promise<void> {
    const c = this.getById(candidateId);
    if (!c) return;
    const documents = { ...c.documents };
    delete documents[key];
    await this.updateCandidate(candidateId, { documents });
  }

  async setDisc(candidateId: string, disc: DiscResult): Promise<void> {
    await this.updateCandidate(candidateId, { disc });
  }

  async setQuestionnaire(candidateId: string, questionnaire: QuestionnaireData): Promise<void> {
    await this.updateCandidate(candidateId, { questionnaire });
  }

  bump(): void {
    void this.load();
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
    return this._candidates().some(
      (c) => c.email.toLowerCase() === normalized && c.id !== excludeId,
    );
  }

  private rowToCandidate(row: CandidatRow): Candidate {
    return {
      id: row.id,
      prenom: row.prenom,
      nom: row.nom,
      email: row.email,
      password: '',
      tel: row.tel ?? '',
      ville: row.ville ?? '',
      cp: row.cp ?? '',
      budget: row.budget ?? '',
      zone: row.zone ?? '',
      source: row.source ?? '',
      statut: row.statut,
      stars: row.stars ?? 0,
      date: row.date_label ?? '',
      notes: row.notes ?? '',
      documents: row.documents ?? {},
      disc: row.disc,
      questionnaire: row.questionnaire,
    };
  }

  private candidateToRow(c: Candidate): Record<string, unknown> {
    return {
      id: c.id,
      prenom: c.prenom,
      nom: c.nom,
      email: c.email,
      tel: c.tel || null,
      ville: c.ville || null,
      cp: c.cp || null,
      budget: c.budget || null,
      zone: c.zone || null,
      source: c.source || null,
      statut: c.statut,
      stars: c.stars,
      date_label: c.date || null,
      notes: c.notes || null,
      documents: c.documents ?? {},
      disc: c.disc,
      questionnaire: c.questionnaire,
    };
  }
}
