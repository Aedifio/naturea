import { Component, computed, inject, input } from '@angular/core';
import * as XLSX from 'xlsx';
import type { Agency, DocMeta, DocPayload, StoredDoc, TableDocPayload } from '../audit-commerce.models';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import { todayISO, uid } from '../utils/audit-commerce.utils';

function fileToScaledDataURL(file: File, maxW = 1400, q = 0.82): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * sc);
        c.height = Math.round(img.height * sc);
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = rej;
      img.src = fr.result as string;
    };
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

@Component({
  selector: 'app-audit-com-docs-tab',
  standalone: true,
  templateUrl: './audit-com-docs-tab.component.html',
})
export class AuditComDocsTabComponent {
  readonly agency = input.required<Agency>();

  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);

  readonly fmtDate = (iso: string) => {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  triggerImage(): void {
    document.getElementById('audit-com-file-img')?.click();
  }

  triggerExcel(): void {
    document.getElementById('audit-com-file-xls')?.click();
  }

  async onImportImage(e: Event): Promise<void> {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.ui.importStatus.set('Import…');
    try {
      const dataURL = await fileToScaledDataURL(f);
      const id = uid();
      const meta: DocMeta = { id, name: f.name, kind: 'image', importedAt: todayISO() };
      this.data.addDocument(this.agency().id, meta, { type: 'image', dataURL });
      this.ui.importStatus.set('');
    } catch (err) {
      alert(`Import image impossible : ${err}`);
      this.ui.importStatus.set('');
    }
    (e.target as HTMLInputElement).value = '';
  }

  async onImportExcel(e: Event): Promise<void> {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.ui.importStatus.set('Import…');
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];
      const id = uid();
      const meta: DocMeta = { id, name: f.name, kind: 'excel', rows: rows.length, importedAt: todayISO() };
      this.data.addDocument(this.agency().id, meta, { type: 'table', rows, sheet: wb.SheetNames[0] });
      this.ui.importStatus.set('');
    } catch (err) {
      alert(`Import Excel impossible : ${err}`);
      this.ui.importStatus.set('');
    }
    (e.target as HTMLInputElement).value = '';
  }

  openDoc(id: string): void {
    this.ui.docViewerId.set(id);
  }

  confirmDelete(id: string): void {
    this.ui.confirmDeleteDocId.set(id);
  }

  doDelete(): void {
    const id = this.ui.confirmDeleteDocId();
    if (!id) return;
    this.data.removeDocument(this.agency().id, id);
    this.ui.confirmDeleteDocId.set(null);
  }

  readonly viewerDoc = computed(() => {
    const id = this.ui.docViewerId();
    return id ? this.data.getDoc(id) : null;
  });

  readonly viewerMeta = computed(() => {
    const id = this.ui.docViewerId();
    return this.agency().documents.find((d) => d.id === id);
  });

  readonly viewerImage = computed((): DocPayload | null => {
    const doc = this.viewerDoc();
    return doc?.type === 'image' ? doc : null;
  });

  readonly viewerTable = computed((): TableDocPayload | null => {
    const doc = this.viewerDoc();
    return doc?.type === 'table' ? doc : null;
  });

  closeViewer(): void {
    this.ui.docViewerId.set(null);
  }
}
