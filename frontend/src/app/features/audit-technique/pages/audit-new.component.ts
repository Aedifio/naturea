import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { EcartType } from '../audit-technique.models';
import { ECARTS, NEW_AUDIT_STEPS } from '../constants/audit-technique.constants';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { AuditTechniqueDraftService } from '../services/audit-technique-draft.service';
import { scoreColor, scoreLabel } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-new',
  standalone: true,
  imports: [FormsModule, RouterLink, AuditScoreRingComponent],
  templateUrl: './audit-new.component.html',
})
export class AuditNewComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(AuditTechniqueDataService);
  private readonly draft = inject(AuditTechniqueDraftService);
  private readonly router = inject(Router);

  readonly agenceId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('agenceId')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('agenceId')) },
  );

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
      const id = this.agenceId();
      if (id) this.draft.start(id);
    });
  }

  cancel(): void {
    this.draft.reset();
    void this.router.navigate(['/apps/audit-technique/agence', this.agenceId()]);
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
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        const current = this.draft.data()?.corps.find((x) => x.id === id);
        if (!current) return;
        this.draft.patchCorps(id, { photos: [...current.photos, result] });
      };
      reader.readAsDataURL(file);
    });
    (e.target as HTMLInputElement).value = '';
  }

  removePhoto(idx: number): void {
    const id = this.activeCorpsId();
    const c = this.activeCorps();
    if (id === null || !c) return;
    this.draft.patchCorps(id, { photos: c.photos.filter((_, i) => i !== idx) });
  }

  saveAudit(): void {
    const d = this.draftData();
    if (!d) return;
    this.data.addAudit(this.agenceId(), { ...d });
    this.draft.reset();
    void this.router.navigate(['/apps/audit-technique/agence', this.agenceId()]);
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
