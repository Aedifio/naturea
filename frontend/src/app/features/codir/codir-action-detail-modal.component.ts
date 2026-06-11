import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodirAction, CodirDataService } from '../../core/services/codir-data.service';
import { CodirIconComponent } from '../../shared/components/codir-icon/codir-icon.component';

@Component({
  selector: 'app-codir-action-detail-modal',
  standalone: true,
  imports: [FormsModule, CodirIconComponent],
  templateUrl: './codir-action-detail-modal.component.html',
  styleUrl: './codir-action-detail-modal.component.scss',
})
export class CodirActionDetailModalComponent {
  readonly codir = inject(CodirDataService);

  readonly actionId = input<string | null>(null);
  readonly close = output<void>();
  readonly saved = output<string>();

  readonly newComment = signal('');
  readonly commentAuthorId = signal('');

  readonly action = computed(() => this.codir.actionById(this.actionId()));
  readonly themes = this.codir.themes;
  readonly assignees = this.codir.assignees;

  readonly modalTitle = computed(() => {
    const t = this.action()?.title ?? '';
    return t.length > 60 ? t.slice(0, 60) + '…' : t;
  });

  readonly sortedComments = computed(() => {
    const comments = this.action()?.comments ?? [];
    return [...comments].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  });

  readonly sortedHistory = computed(() => {
    const history = this.action()?.history ?? [];
    return [...history].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  });

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-bg')) {
      this.close.emit();
    }
  }

  patch(id: string, patch: Parameters<CodirDataService['patchAction']>[1], history?: string): void {
    this.codir.patchAction(id, patch, history);
    this.saved.emit(history ?? 'Modifications enregistrées');
  }

  onFieldChange(id: string, key: string, value: string, label: string, postLabel?: string): void {
    const action = this.codir.actionById(id);
    if (!action) return;
    const old = String((action as unknown as Record<string, unknown>)[key] ?? '');
    if (value === old) return;
    if (key === 'title' && !value.trim()) return;
    const hist = `${label} → ${postLabel ?? (value || '—')}`;
    this.patch(id, { [key]: value } as Partial<CodirAction>, hist);
  }

  onStatusChange(id: string, value: string): void {
    this.patch(id, { status: value }, `Statut → ${this.codir.statusMeta(value).label}`);
  }

  onPriorityChange(id: string, value: string): void {
    const labels: Record<string, string> = { low: 'Faible', medium: 'Moyenne', high: 'Haute' };
    this.patch(id, { priority: value }, `Priorité → ${labels[value] ?? value}`);
  }

  onOwnerChange(id: string, value: string): void {
    this.codir.setOwner(id, value || undefined);
    this.saved.emit('Responsable mis à jour');
  }

  toggleCoOwner(memberId: string): void {
    const id = this.actionId();
    if (!id) return;
    if (memberId === this.action()?.ownerId) return;
    this.codir.toggleCoOwner(id, memberId);
    this.saved.emit('Co-responsables mis à jour');
  }

  isCoOwnerCandidate(memberId: string): boolean {
    return memberId !== this.action()?.ownerId;
  }

  isCoOwner(memberId: string): boolean {
    return (this.action()?.coOwnerIds ?? []).includes(memberId);
  }

  publishComment(): void {
    const id = this.actionId();
    const text = this.newComment().trim();
    if (!id || !text) return;
    this.codir.addComment(id, text, this.commentAuthorId() || undefined);
    this.newComment.set('');
    this.saved.emit('Commentaire publié');
  }

  removeComment(commentId: string): void {
    const id = this.actionId();
    if (!id || !confirm('Supprimer ce commentaire ?')) return;
    this.codir.removeComment(id, commentId);
    this.saved.emit('Commentaire supprimé');
  }

  deleteAction(): void {
    const id = this.actionId();
    if (!id || !confirm('Supprimer définitivement cette action ?')) return;
    this.codir.deleteAction(id);
    this.close.emit();
  }

  archiveAction(): void {
    const id = this.actionId();
    if (!id) return;
    this.codir.archiveAction(id);
    this.close.emit();
    this.saved.emit('Tâche archivée');
  }

  unarchiveAction(): void {
    const id = this.actionId();
    if (!id) return;
    this.codir.unarchiveAction(id);
    this.close.emit();
    this.saved.emit('Tâche désarchivée');
  }

  commentAuthorName(authorId?: string | null): string {
    if (!authorId) return 'Anonyme';
    return this.codir.assigneeById(authorId)?.name ?? 'Anonyme';
  }

  isImportedComment(commentId?: string): boolean {
    return !!commentId && (commentId.startsWith('cmt_init_') || commentId.startsWith('cmt_note_'));
  }
}
