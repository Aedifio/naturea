import { Injectable, signal } from '@angular/core';
import type { AgencyTab, SynthView } from '../audit-commerce.models';

const YM_KEY = 'audit-com:ym';

@Injectable({ providedIn: 'root' })
export class AuditCommerceUiService {
  readonly ym = signal(this.loadYm());
  readonly tab = signal<AgencyTab>('synthese');
  readonly synthView = signal<SynthView>('mois');
  readonly auditId = signal<string | null>(null);
  readonly auditEdit = signal(false);
  readonly archOpen = signal(false);
  readonly settingsOpen = signal(false);
  readonly bulkText = signal('');
  readonly closedSections = signal<Set<string>>(new Set());
  readonly openNotes = signal<Set<string>>(new Set());
  readonly auditExpanded = signal<Set<string>>(new Set());
  readonly confirmDeleteAuditId = signal<string | null>(null);
  readonly confirmDeleteDocId = signal<string | null>(null);
  readonly docViewerId = signal<string | null>(null);
  readonly importStatus = signal('');

  setYm(value: string): void {
    this.ym.set(value);
    try {
      sessionStorage.setItem(YM_KEY, value);
    } catch {
      /* ignore */
    }
  }

  setTab(tab: AgencyTab): void {
    this.tab.set(tab);
    this.auditEdit.set(false);
  }

  toggleSection(id: string): void {
    this.closedSections.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleNote(id: string): void {
    this.openNotes.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  toggleAuditExpanded(id: string): void {
    this.auditExpanded.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  resetAgencyUi(): void {
    this.tab.set('synthese');
    this.auditEdit.set(false);
    this.auditId.set(null);
    this.archOpen.set(false);
    this.closedSections.set(new Set());
    this.openNotes.set(new Set());
    this.auditExpanded.set(new Set());
  }

  openSettings(): void {
    this.settingsOpen.set(true);
  }

  closeSettings(): void {
    this.settingsOpen.set(false);
  }

  private loadYm(): string {
    try {
      const stored = sessionStorage.getItem(YM_KEY);
      if (stored && /^\d{4}-\d{2}$/.test(stored)) return stored;
    } catch {
      /* ignore */
    }
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
