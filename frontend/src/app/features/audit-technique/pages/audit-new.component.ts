import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import type { AuditPhotoRef, EcartType } from '../audit-technique.models';
import { ECARTS, NEW_AUDIT_STEPS } from '../constants/audit-technique.constants';
import { AuditPhotoGridComponent } from '../components/audit-photo-grid.component';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { FileStorageService } from '../../../core/storage/file-storage.service';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { AuditTechniqueDraftService } from '../services/audit-technique-draft.service';
import { scoreColor, scoreLabel } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-new',
  standalone: true,
  imports: [FormsModule, AuditPhotoGridComponent, AuditScoreRingComponent],
  templateUrl: './audit-new.component.html',
})
export class AuditNewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(AuditTechniqueDataService);
  private readonly draft = inject(AuditTechniqueDraftService);
  private readonly router = inject(Router);
  private readonly files = inject(FileStorageService);

  readonly agenceId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('agenceId')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('agenceId')) },
  );
  readonly auditId = toSignal(
    this.route.paramMap.pipe(map((p) => {
      const raw = p.get('auditId');
      return raw ? Number(raw) : null;
    })),
    { initialValue: (() => {
      const raw = this.route.snapshot.paramMap.get('auditId');
      return raw ? Number(raw) : null;
    })() },
  );

  private readonly initKey = signal<string | null>(null);

  readonly editMode = computed(() => this.auditId() !== null);

  readonly steps = NEW_AUDIT_STEPS;
  readonly ecarts = ECARTS;

  readonly agence = computed(() => this.data.getAgence(this.agenceId()));
  readonly step = computed(() => this.draft.step());
  readonly activeCorpsId = computed(() => this.draft.activeCorpsId());
  readonly draftData = computed(() => this.draft.data());
  readonly score = computed(() => this.draft.draftScore());

  readonly activeCorps = computed(() => {
    const id = this.activeCorpsId();
    const d = this.draftData();
    if (id === null || !d) return null;
    return d.corps.find((c) => c.id === id) ?? null;
  });

  readonly corpsComment = signal('');

  readonly scoreColor = scoreColor;
  readonly scoreLabel = scoreLabel;

  constructor() {
    effect(() => {
      const agenceId = this.agenceId();
      const auditId = this.auditId();
      const catalog = this.data.corpsCatalog();
      if (!agenceId || !catalog.length) return;

      const key = auditId ? `edit-${agenceId}-${auditId}` : `new-${agenceId}`;
      if (this.initKey() === key) return;
      this.initKey.set(key);

      if (auditId) {
        const audit = this.data.getAudit(agenceId, auditId);
        if (audit) this.draft.load(audit, catalog);
      } else {
        this.draft.start(catalog);
      }
    });
  }

  cancel(): void {
    const agenceId = this.agenceId();
    const auditId = this.auditId();
    this.initKey.set(null);
    this.draft.reset();
    if (auditId) {
      void this.router.navigate(['/apps/audit-technique/agence', agenceId, 'audit', auditId]);
    } else {
      void this.router.navigate(['/apps/audit-technique/agence', agenceId]);
    }
  }

  nextStep(): void {
    this.saveStep0();
    this.draft.nextStep();
  }

  prevStep(): void {
    this.saveStep0();
    this.draft.prevStep();
  }

  saveStep0(): void {
    const d = this.draftData();
    if (!d) return;
    this.draft.patchDraft({
      date: d.date,
      auditeur: d.auditeur,
      chantiers: d.chantiers,
      participants: d.participants,
      commentaires: d.commentaires,
    });
  }

  openCorps(id: number): void {
    this.draft.openCorps(id);
    const c = this.draft.data()?.corps.find((x) => x.id === id);
    this.corpsComment.set(c?.commentaire ?? '');
  }

  closeCorps(): void {
    this.saveCorpsComment();
    this.draft.closeCorps();
  }

  setNote(n: number | null): void {
    const id = this.activeCorpsId();
    if (id === null) return;
    this.draft.patchCorps(id, { note: n });
  }

  toggleEcart(value: EcartType): void {
    const id = this.activeCorpsId();
    const c = this.activeCorps();
    if (id === null || !c) return;
    this.draft.patchCorps(id, { ecart: c.ecart === value ? null : value });
  }

  saveCorpsComment(): void {
    const id = this.activeCorpsId();
    if (id === null) return;
    this.draft.patchCorps(id, { commentaire: this.corpsComment() });
  }

  onPhotoSelect(e: Event): void {
    const id = this.activeCorpsId();
    const c = this.activeCorps();
    if (id === null || !c) return;
    const files = (e.target as HTMLInputElement).files;
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      void this.uploadPhoto(id, file);
    });
    (e.target as HTMLInputElement).value = '';
  }

  private async uploadPhoto(corpsId: number, file: File): Promise<void> {
    const agenceId = this.agenceId();
    const auditId = this.draftData()?.id;
    if (!auditId) return;
    const path = `agence-${agenceId}/audit-${auditId}/corps-${corpsId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    try {
      const uploaded = await this.files.upload('audit-technique', path, file, {
        appSlot: 'AUDIT',
        entityType: 'audit',
        entityId: String(auditId),
        kind: 'photo',
      });
      const current = this.draft.data()?.corps.find((x) => x.id === corpsId);
      if (!current) return;
      const photo: AuditPhotoRef = {
        portalFileId: uploaded.portalFileId,
        filename: uploaded.filename,
      };
      this.draft.patchCorps(corpsId, { photos: [...current.photos, photo] });
    } catch (err) {
      console.warn('[AuditNew] photo upload failed', err);
    }
  }

  removePhoto(idx: number): void {
    const id = this.activeCorpsId();
    const c = this.activeCorps();
    if (id === null || !c) return;
    const photo = c.photos[idx];
    if (!photo) return;
    this.draft.patchCorps(id, { photos: c.photos.filter((_, i) => i !== idx) });
    if (!this.editMode()) {
      void this.files.deletePortalFile(photo.portalFileId).catch((err) => {
        console.warn('[AuditNew] photo delete failed', err);
      });
    }
  }

  saveAudit(): void {
    const d = this.draftData();
    if (!d) return;
    const agenceId = this.agenceId();
    if (this.editMode()) {
      this.data.updateAudit(agenceId, { ...d });
      this.initKey.set(null);
      this.draft.reset();
      void this.router.navigate(['/apps/audit-technique/agence', agenceId, 'audit', d.id]);
    } else {
      this.data.addAudit(agenceId, { ...d });
      this.initKey.set(null);
      this.draft.reset();
      void this.router.navigate(['/apps/audit-technique/agence', agenceId]);
    }
  }

  ecartMeta(value: string | null) {
    return ECARTS.find((e) => e.value === value);
  }

  patchField(field: 'date' | 'auditeur' | 'chantiers' | 'participants' | 'commentaires', value: string): void {
    this.draft.patchDraft({ [field]: value });
  }

  draftNotedCount(): number {
    return this.draftData()?.corps.filter((c) => c.note !== null).length ?? 0;
  }

  draftUrgentCount(): number {
    return this.draftData()?.corps.filter((c) => c.ecart === 'urgent').length ?? 0;
  }

  draftMinorCount(): number {
    return this.draftData()?.corps.filter((c) => c.ecart === 'mineur').length ?? 0;
  }

  draftUrgentCorps() {
    return this.draftData()?.corps.filter((c) => c.ecart === 'urgent') ?? [];
  }

  draftNotedCorps() {
    return this.draftData()?.corps.filter((c) => c.note !== null) ?? [];
  }
}
