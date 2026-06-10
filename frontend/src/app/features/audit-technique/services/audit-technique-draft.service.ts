import { Injectable, signal } from '@angular/core';
import type { NewAuditDraft } from '../audit-technique.models';
import { createEmptyCorps } from '../constants/audit-technique.constants';

@Injectable({ providedIn: 'root' })
export class AuditTechniqueDraftService {
  readonly step = signal(0);
  readonly activeCorpsId = signal<number | null>(null);
  readonly data = signal<NewAuditDraft | null>(null);

  start(agenceId?: number): void {
    void agenceId;
    this.step.set(0);
    this.activeCorpsId.set(null);
    this.data.set({
      id: Date.now(),
      date: new Date().toISOString().slice(0, 10),
      auditeur: '',
      chantiers: '',
      participants: '',
      commentaires: '',
      corps: createEmptyCorps(),
    });
  }

  reset(): void {
    this.step.set(0);
    this.activeCorpsId.set(null);
    this.data.set(null);
  }

  nextStep(): void {
    this.step.update((s) => Math.min(s + 1, 2));
  }

  prevStep(): void {
    this.step.update((s) => Math.max(s - 1, 0));
  }

  openCorps(id: number): void {
    this.activeCorpsId.set(id);
  }

  closeCorps(): void {
    this.activeCorpsId.set(null);
  }

  patchDraft(patch: Partial<NewAuditDraft>): void {
    const d = this.data();
    if (!d) return;
    this.data.set({ ...d, ...patch });
  }

  patchCorps(corpsId: number, patch: Partial<NewAuditDraft['corps'][0]>): void {
    const d = this.data();
    if (!d) return;
    this.data.set({
      ...d,
      corps: d.corps.map((c) => (c.id === corpsId ? { ...c, ...patch } : c)),
    });
  }

  draftScore(): number | null {
    const d = this.data();
    if (!d) return null;
    const items = d.corps.filter((c) => c.note !== null);
    if (!items.length) return null;
    return items.reduce((s, c) => s + (c.note ?? 0), 0) / items.length;
  }
}
