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
  email: string | null;
  portal_user_id: string | null;
  tel: string | null;
  ville: string | null;
  cp: string | null;
  budget: string | null;
  zone: string | null;
  source: string | null;
  statut: string;
  stars: number | null;
  date_candidature: string | null;
  archived: boolean | null;
  archived_at: string | null;
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

  readonly activeCandidates = computed(() => this._candidates().filter((c) => !c.archived));

  readonly archivedCandidates = computed(() => this._candidates().filter((c) => c.archived));

  readonly dashboardStats = computed(() => {
    const list = this.activeCandidates();
    return {
      total: list.length,
      nouveaux: list.filter((c) => c.statut === 'Nouveau').length,
      rdv: list.filter((c) => c.statut === 'RDV planifié').length,
      qualifies: list.filter((c) => c.statut === 'Qualifié').length,
    };
  });

  async load(): Promise<void> {
    const { data, error } = await this.supabase.rpc('list_recrutement_candidats');
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
    const current = this.getById(id);
    if (!current) return;

    const normalizedEmail = patch.email?.trim().toLowerCase();
    const emailChanged =
      !!normalizedEmail && normalizedEmail !== current.email.trim().toLowerCase();
    if (emailChanged) {
      await this.syncCandidateEmail(id, normalizedEmail);
    }

    const updated = { ...current, ...patch };
    if (normalizedEmail) {
      updated.email = normalizedEmail;
    }

    const row = this.candidateToRow(updated);
    if (emailChanged) {
      delete row['email'];
    }
    const { error } = await this.supabase.from('recrutement_candidats').update(row).eq('id', id);
    if (error) throw error;
    this._candidates.update((list) => list.map((c) => (c.id === id ? updated : c)));
  }

  private async syncCandidateEmail(id: string, email: string): Promise<void> {
    const { error } = await this.supabase.rpc('update_recrutement_candidat_email', {
      p_candidat_id: id,
      p_email: email,
    });
    if (error) throw error;
  }

  async addCandidate(candidate: Candidate): Promise<void> {
    const password = candidate.password;
    const { error } = await this.supabase.from('recrutement_candidats').insert(this.candidateToRow(candidate));
    if (error) throw error;
    if (password) {
      await this.setPassword(candidate.id, password);
    }
    await this.load();
  }

  async setPassword(candidateId: string, password: string): Promise<void> {
    const { error } = await this.supabase.rpc('set_recrutement_candidat_password', {
      p_candidat_id: candidateId,
      p_password: password,
    });
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

  async archiveCandidate(id: string): Promise<void> {
    await this.updateCandidate(id, {
      archived: true,
      archivedAt: new Date().toISOString(),
    });
  }

  async unarchiveCandidate(id: string): Promise<void> {
    await this.updateCandidate(id, {
      archived: false,
      archivedAt: undefined,
    });
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
    return crypto.randomUUID();
  }

  now(): string {
    return new Date().toLocaleDateString('fr-FR');
  }

  nowIso(): string {
    return new Date().toISOString();
  }

  formatCandidatureDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  }

  async emailTaken(email: string, excludeId?: string): Promise<boolean> {
    const normalized = email.trim().toLowerCase();
    if (!normalized) return false;
    const { data, error } = await this.supabase.rpc('recrutement_email_in_use', {
      p_email: normalized,
      p_exclude_candidat_id: excludeId ?? null,
    });
    if (error) throw error;
    return !!data;
  }

  private rowToCandidate(row: CandidatRow): Candidate {
    return {
      id: row.id,
      prenom: row.prenom,
      nom: row.nom,
      email: row.email ?? '',
      portalUserId: row.portal_user_id ?? null,
      hasPortalAccount: !!row.portal_user_id,
      tel: row.tel ?? '',
      ville: row.ville ?? '',
      cp: row.cp ?? '',
      budget: row.budget ?? '',
      zone: row.zone ?? '',
      source: row.source ?? '',
      statut: row.statut,
      stars: row.stars ?? 0,
      dateCandidature: row.date_candidature ?? '',
      archived: row.archived ?? false,
      archivedAt: row.archived_at ?? undefined,
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
      email: c.hasPortalAccount ? null : c.email?.trim().toLowerCase() || null,
      tel: c.tel || null,
      ville: c.ville || null,
      cp: c.cp || null,
      budget: c.budget || null,
      zone: c.zone || null,
      source: c.source || null,
      statut: c.statut,
      stars: c.stars,
      date_candidature: c.dateCandidature || null,
      archived: c.archived ?? false,
      archived_at: c.archivedAt ?? null,
      notes: c.notes || null,
      documents: c.documents ?? {},
      disc: c.disc,
      questionnaire: c.questionnaire,
    };
  }
}
