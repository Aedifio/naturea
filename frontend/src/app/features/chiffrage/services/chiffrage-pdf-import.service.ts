import { Injectable, inject, signal } from '@angular/core';
import * as pdfjsLib from 'pdfjs-dist';
import type {
  CurrentImportState,
  ImportHistoryEntry,
  ImportPreviewPoste,
  ImportQueueEntry,
  ParsedImportPoste,
  UsineKey,
} from '../chiffrage.models';
import {
  detectUsineFromText,
  extractMetadata,
  parsePostes,
  suggestMapping,
} from '../utils/chiffrage-pdf-parser.utils';
import { ChiffrageDataService } from './chiffrage-data.service';
import { ChiffrageToastService } from './chiffrage-toast.service';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

@Injectable({ providedIn: 'root' })
export class ChiffragePdfImportService {
  private readonly data = inject(ChiffrageDataService);
  private readonly toast = inject(ChiffrageToastService);

  readonly pdfJsReady = signal(true);
  readonly queue = signal<ImportQueueEntry[]>([]);
  readonly currentImport = signal<CurrentImportState | null>(null);
  readonly historyRevision = signal(0);

  readonly importHistory = signal<ImportHistoryEntry[]>([]);

  constructor() {
    this.refreshHistory();
    try {
      if (typeof pdfjsLib.getDocument !== 'function') {
        this.pdfJsReady.set(false);
      }
    } catch {
      this.pdfJsReady.set(false);
    }
  }

  refreshHistory(): void {
    this.importHistory.set(this.data.getTarifsHistory());
    this.historyRevision.update((n) => n + 1);
  }

  handleFiles(fileList: FileList | File[] | null): void {
    const files = Array.from(fileList ?? []).filter((f) => f.name.toLowerCase().endsWith('.pdf'));
    if (!files.length) {
      this.toast.show('⚠️ Aucun fichier PDF détecté');
      return;
    }
    files.forEach((file) => {
      const entry: ImportQueueEntry = { file, name: file.name, status: 'parsing' };
      this.queue.update((q) => [...q, entry]);
      void this.processFile(entry);
    });
  }

  removeFromQueue(index: number): void {
    const removed = this.queue()[index];
    this.queue.update((q) => q.filter((_, i) => i !== index));
    const current = this.currentImport();
    if (current && current.fileEntry === removed) {
      this.currentImport.set(null);
    }
    if (!this.queue().length) {
      this.currentImport.set(null);
    }
  }

  showPreviewByIndex(index: number): void {
    const entry = this.queue()[index];
    if (entry?.status === 'ok' && entry.parsed) {
      this.showPreview(entry);
    }
  }

  showPreview(fileEntry: ImportQueueEntry): void {
    if (!fileEntry.parsed) return;
    const usine = fileEntry.parsed.usine;
    this.currentImport.set({
      fileEntry,
      usine,
      meta: fileEntry.parsed.meta,
      postes: fileEntry.parsed.postes.map((p) => this.buildPreviewPoste(usine, p)),
    });
  }

  closePreview(): void {
    this.currentImport.set(null);
  }

  setImportUsine(usine: UsineKey | null): void {
    const current = this.currentImport();
    if (!current) return;
    this.currentImport.set({
      ...current,
      usine,
      postes: current.postes.map((p) => this.buildPreviewPoste(usine, p)),
    });
  }

  setPosteMapping(index: number, mapped: string | null): void {
    const current = this.currentImport();
    if (!current) return;
    const postes = [...current.postes];
    const p = { ...postes[index] };
    p.mapped = mapped || null;
    p.ancien_pu = mapped && current.usine ? this.data.getPrixCalcule(current.usine, mapped) : null;
    p.delta_pct =
      p.ancien_pu !== null && p.pu ? ((p.pu - p.ancien_pu) / p.ancien_pu) * 100 : null;
    p.applique = false;
    postes[index] = p;
    this.currentImport.set({ ...current, postes });
  }

  togglePosteApply(index: number, checked: boolean): void {
    const current = this.currentImport();
    if (!current) return;
    const postes = [...current.postes];
    postes[index] = { ...postes[index], applique: checked };
    this.currentImport.set({ ...current, postes });
  }

  selectAllApplicable(checked: boolean): void {
    const current = this.currentImport();
    if (!current) return;
    const postes = current.postes.map((p) =>
      p.mapped && p.ancien_pu !== null ? { ...p, applique: checked } : p,
    );
    this.currentImport.set({ ...current, postes });
  }

  refreshPosteAfterCreate(index: number, code: string): void {
    this.setPosteMapping(index, code);
  }

  applyImport(): void {
    const current = this.currentImport();
    if (!current?.usine) {
      this.toast.show("⚠️ Sélectionne d'abord une usine");
      return;
    }

    const usineKey = current.usine;
    let appliqueCount = 0;

    current.postes.forEach((p) => {
      if (p.applique && p.mapped) {
        this.data.setOverride(usineKey, p.mapped, 'prix_type', 'fixe');
        this.data.setOverride(usineKey, p.mapped, 'prix_unitaire', p.pu);
        appliqueCount++;
      }
    });

    const histEntry: ImportHistoryEntry = {
      id: Date.now(),
      date_import: new Date().toISOString(),
      filename: current.fileEntry.name,
      usine: usineKey,
      devis_num: current.meta.devis_num ?? null,
      devis_date: current.meta.devis_date ?? null,
      client: current.meta.client ?? null,
      total_ht: current.meta.total_ht ?? null,
      postes: current.postes.map((p) => ({
        label_pdf: p.label_pdf,
        unite: p.unite,
        qte: p.qte,
        pu: p.pu,
        total: p.total,
        mapped: p.mapped,
        ancien_pu: p.ancien_pu,
        delta_pct: p.delta_pct,
        applique: p.applique,
      })),
    };

    const hist = [histEntry, ...this.data.getTarifsHistory()];
    this.data.saveTarifsHistory(hist);
    this.refreshHistory();

    this.toast.show(
      appliqueCount > 0
        ? `✓ ${appliqueCount} tarif${appliqueCount > 1 ? 's' : ''} appliqué${appliqueCount > 1 ? 's' : ''} · import historisé`
        : '📋 Import historisé (aucun tarif appliqué)',
    );

    const idx = this.queue().indexOf(current.fileEntry);
    if (idx >= 0) this.removeFromQueue(idx);
    else this.currentImport.set(null);
  }

  deleteHistoryEntry(id: number): void {
    this.data.deleteTarifImport(id);
    this.refreshHistory();
  }

  private buildPreviewPoste(
    usine: UsineKey | null,
    p: ParsedImportPoste,
  ): ImportPreviewPoste {
    const custom = usine ? (this.data.customPostes()[usine] ?? {}) : {};
    const mapped = usine ? suggestMapping(usine, p, custom) : null;
    const ancien_pu = mapped && usine ? this.data.getPrixCalcule(usine, mapped) : null;
    const delta_pct =
      ancien_pu !== null && p.pu ? ((p.pu - ancien_pu) / ancien_pu) * 100 : null;
    return { ...p, mapped, ancien_pu, delta_pct, applique: false };
  }

  private async processFile(fileEntry: ImportQueueEntry): Promise<void> {
    this.updateQueueEntry(fileEntry, { status: 'parsing' });
    try {
      const text = await this.readPdfText(fileEntry.file);
      const cleanText = text.replace(/\s+/g, ' ').trim();
      if (cleanText.length < 200) {
        this.updateQueueEntry(fileEntry, {
          status: 'scan',
          error:
            'PDF probablement scanné (peu ou pas de texte extractible). Saisie manuelle à venir dans une prochaine version.',
        });
        return;
      }
      const usine = detectUsineFromText(text);
      const meta = extractMetadata(text);
      const postes = parsePostes(text);
      this.updateQueueEntry(fileEntry, {
        status: 'ok',
        parsed: { usine, meta, postes, text },
      });
      if (!this.currentImport()) {
        const updated = this.queue().find((e) => e === fileEntry);
        if (updated?.parsed) this.showPreview(updated);
      }
    } catch (err) {
      this.updateQueueEntry(fileEntry, {
        status: 'err',
        error: err instanceof Error ? err.message : 'Erreur de lecture du PDF',
      });
    }
  }

  private updateQueueEntry(
    fileEntry: ImportQueueEntry,
    patch: Partial<ImportQueueEntry>,
  ): void {
    Object.assign(fileEntry, patch);
    this.queue.update((q) => [...q]);
  }

  private async readPdfText(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items
        .map((it) => {
          const item = it as { str: string; transform: number[] };
          return { str: item.str, x: item.transform[4], y: Math.round(item.transform[5]) };
        })
        .sort((a, b) => b.y - a.y || a.x - b.x);
      let curY: number | null = null;
      let lineParts: string[] = [];
      const lines: string[] = [];
      items.forEach((it) => {
        if (curY === null || Math.abs(curY - it.y) > 3) {
          if (lineParts.length) lines.push(lineParts.join(' '));
          lineParts = [it.str];
          curY = it.y;
        } else {
          lineParts.push(it.str);
        }
      });
      if (lineParts.length) lines.push(lineParts.join(' '));
      fullText += lines.join('\n') + '\n';
    }
    return fullText;
  }
}
