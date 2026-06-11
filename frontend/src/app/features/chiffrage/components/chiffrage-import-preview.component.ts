import { Component, computed, inject, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { REFS } from '../constants/chiffrage-refs.constants';
import type { ImportPreviewPoste, UsineKey } from '../chiffrage.models';
import { ChiffrageCreatePosteImportModalComponent } from './chiffrage-create-poste-import-modal.component';
import { ChiffrageDataService } from '../services/chiffrage-data.service';
import { ChiffragePdfImportService } from '../services/chiffrage-pdf-import.service';
import { fmtDateFR, fmtEurR, fmtNum } from '../utils/chiffrage.utils';

@Component({
  selector: 'app-chiffrage-import-preview',
  standalone: true,
  imports: [FormsModule, ChiffrageCreatePosteImportModalComponent],
  templateUrl: './chiffrage-import-preview.component.html',
})
export class ChiffrageImportPreviewComponent {
  private readonly importSvc = inject(ChiffragePdfImportService);
  private readonly data = inject(ChiffrageDataService);
  private readonly modal = viewChild(ChiffrageCreatePosteImportModalComponent);

  readonly current = this.importSvc.currentImport;

  readonly usineKeys = computed(() => this.data.usineKeys());

  fmtNum = fmtNum;
  fmtEurR = fmtEurR;
  fmtDateFR = fmtDateFR;

  usineOptions = computed(() =>
    this.usineKeys().map((k) => ({ key: k, nom: this.data.getUsineLabel(k) })),
  );

  mappedCount = computed(() => {
    const postes = this.current()?.postes ?? [];
    return postes.filter((p) => p.mapped && p.ancien_pu !== null).length;
  });

  newCount = computed(() => {
    const postes = this.current()?.postes ?? [];
    return postes.filter((p) => p.mapped && p.ancien_pu === null).length;
  });

  summaryText = computed(() => {
    const postes = this.current()?.postes ?? [];
    const sel = postes.filter((p) => p.applique).length;
    const total = postes.filter((p) => p.mapped && p.ancien_pu !== null).length;
    if (sel > 0) {
      return `${sel} ligne${sel > 1 ? 's' : ''} sélectionnée${sel > 1 ? 's' : ''} sur ${total} mappée${total > 1 ? 's' : ''}`;
    }
    return `Coche les lignes à appliquer (sur ${total} mappée${total > 1 ? 's' : ''})`;
  });

  allApplicableSelected = computed(() => {
    const postes = this.current()?.postes ?? [];
    const applicable = postes.filter((p) => p.mapped && p.ancien_pu !== null);
    return applicable.length > 0 && applicable.every((p) => p.applique);
  });

  cancel(): void {
    this.importSvc.closePreview();
  }

  apply(): void {
    void this.importSvc.applyImport();
  }

  onUsineChange(value: string): void {
    this.importSvc.setImportUsine((value || null) as UsineKey | null);
  }

  onMappingChange(index: number, value: string): void {
    this.importSvc.setPosteMapping(index, value || null);
  }

  onApplyToggle(index: number, event: Event): void {
    this.importSvc.togglePosteApply(index, (event.target as HTMLInputElement).checked);
  }

  onSelectAll(event: Event): void {
    this.importSvc.selectAllApplicable((event.target as HTMLInputElement).checked);
  }

  openCreatePoste(index: number, poste: ImportPreviewPoste): void {
    const usine = this.current()?.usine;
    if (!usine) return;
    this.modal()?.openFor(usine, index, poste, (code) => {
      this.importSvc.refreshPosteAfterCreate(index, code);
    });
  }

  posteOptions(usineKey: UsineKey | null): Array<{ code: string; label: string; custom: boolean }> {
    if (!usineKey) return [];
    const base = Object.entries(REFS[usineKey].postes).map(([code, p]) => ({
      code,
      label: p.label_user,
      custom: false,
    }));
    const custom = Object.entries(this.data.customPostes()[usineKey] ?? {}).map(([code, p]) => ({
      code,
      label: p.label_user,
      custom: true,
    }));
    return [...base, ...custom];
  }

  deltaHtml(p: ImportPreviewPoste): { cls: string; text: string } {
    if (!p.mapped || p.ancien_pu === null) {
      if (p.mapped) return { cls: 'new', text: 'nouveau' };
      return { cls: 'unmap', text: 'non mappé' };
    }
    if (Math.abs(p.delta_pct ?? 0) < 0.1) return { cls: 'same', text: '= 0%' };
    const pct = p.delta_pct ?? 0;
    if (pct > 10) return { cls: 'up', text: `↑ +${pct.toFixed(1)}%` };
    if (pct > 0) return { cls: 'up-mid', text: `↑ +${pct.toFixed(1)}%` };
    return { cls: 'down', text: `↓ ${pct.toFixed(1)}%` };
  }

  rowClass(p: ImportPreviewPoste): string {
    if (!p.mapped) return 'unmapped';
    if (p.applique) return 'applied';
    return '';
  }

  isCustom(usine: UsineKey | null, code: string | null): boolean {
    return !!(usine && code && this.data.isCustomPoste(usine, code));
  }

  selectText(event: Event): void {
    (event.target as HTMLTextAreaElement).select();
  }
}
