import { Component, computed, inject, signal } from '@angular/core';
import { DEVIS_HIST } from '../constants/chiffrage-devis-hist.constants';
import type { HistoryUsineStat, ImportHistoryEntry } from '../chiffrage.models';
import { fmtDateFR, fmtDateTimeFR, fmtEurR, fmtNum } from '../utils/chiffrage.utils';
import { ChiffrageImportPreviewComponent } from '../components/chiffrage-import-preview.component';
import { ChiffrageDataService } from '../services/chiffrage-data.service';
import { ChiffragePdfImportService } from '../services/chiffrage-pdf-import.service';

@Component({
  selector: 'app-chiffrage-historique',
  standalone: true,
  imports: [ChiffrageImportPreviewComponent],
  templateUrl: './chiffrage-historique.component.html',
})
export class ChiffrageHistoriqueComponent {
  readonly importSvc = inject(ChiffragePdfImportService);
  readonly data = inject(ChiffrageDataService);

  readonly devisHist = [...DEVIS_HIST].sort((a, b) => b.date.localeCompare(a.date));
  readonly dragOver = signal(false);

  readonly importHistory = computed(() => {
    this.importSvc.historyRevision();
    return this.importSvc.importHistory();
  });

  readonly historyStats = computed((): HistoryUsineStat[] => {
    const list = this.importHistory();
    const cutoff = Date.now() - 30 * 86400000;
    const recent = list.filter((h) => new Date(h.date_import).getTime() >= cutoff);
    const byUsine: Record<string, number[]> = {};
    recent.forEach((h) => {
      if (!byUsine[h.usine]) byUsine[h.usine] = [];
      h.postes.forEach((p) => {
        if (p.applique && typeof p.delta_pct === 'number') {
          byUsine[h.usine].push(p.delta_pct);
        }
      });
    });
    return Object.entries(byUsine)
      .filter(([, arr]) => arr.length > 0)
      .map(([u, arr]) => ({
        usine: u as HistoryUsineStat['usine'],
        avg: arr.reduce((s, x) => s + x, 0) / arr.length,
        n: arr.length,
      }));
  });

  fmtNum = fmtNum;
  fmtEurR = fmtEurR;
  fmtDateFR = fmtDateFR;

  usineNom(key: string): string {
    return this.data.getUsineLabel(key);
  }

  isSicob2026(date: string, usine: string): boolean {
    return usine === 'sicob' && date >= '2026-01-01';
  }

  onFileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.importSvc.handleFiles(input.files);
    input.value = '';
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    this.importSvc.handleFiles(event.dataTransfer?.files ?? null);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  deleteImport(h: ImportHistoryEntry, event: Event): void {
    event.stopPropagation();
    if (
      !confirm(
        "Supprimer cet import de l'historique ?\n\nLes tarifs déjà appliqués ne seront pas annulés (utilise Paramètres pour ça).",
      )
    ) {
      return;
    }
    this.importSvc.deleteHistoryEntry(h.id);
  }

  viewHistoryDetail(h: ImportHistoryEntry): void {
    const lines = h.postes
      .map((p) => {
        const delta =
          typeof p.delta_pct === 'number'
            ? `${p.delta_pct >= 0 ? '+' : ''}${p.delta_pct.toFixed(1)}%`
            : '—';
        return `${p.applique ? '✓' : '·'} ${p.label_pdf} · ${fmtNum(p.pu, 2)} € (${delta})`;
      })
      .join('\n');
    alert(
      `Devis ${h.devis_num || '?'} · ${this.usineNom(h.usine)}\nClient : ${h.client || '—'}\nDate devis : ${h.devis_date ? fmtDateFR(h.devis_date) : '—'}\nTotal HT : ${h.total_ht ? fmtEurR(h.total_ht) : '—'}\n\nPostes :\n${lines}`,
    );
  }

  historyDateLabel(iso: string): string {
    return fmtDateTimeFR(iso);
  }

  appliedCount(h: ImportHistoryEntry): number {
    return h.postes.filter((p) => p.applique).length;
  }

  avgDelta(h: ImportHistoryEntry): number | null {
    const deltas = h.postes
      .filter((p) => p.applique && typeof p.delta_pct === 'number')
      .map((p) => p.delta_pct as number);
    return deltas.length ? deltas.reduce((s, x) => s + x, 0) / deltas.length : null;
  }

  deltaClass(avg: number): string {
    if (avg > 5) return 'up';
    if (avg > 0) return 'up-mid';
    return 'down';
  }
}
