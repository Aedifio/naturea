import { Injectable, signal } from '@angular/core';
import { StoredDocument } from '../recrutement.models';

@Injectable({ providedIn: 'root' })
export class RecrutFileViewerService {
  readonly open = signal(false);
  readonly file = signal<StoredDocument | null>(null);
  readonly label = signal('');

  show(file: StoredDocument, label: string): void {
    this.file.set(file);
    this.label.set(label);
    this.open.set(true);
  }

  close(): void {
    this.open.set(false);
    this.file.set(null);
    this.label.set('');
  }

  download(): void {
    const file = this.file();
    if (!file?.dataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = file.dataUrl;
    anchor.download = file.name;
    anchor.click();
  }
}
