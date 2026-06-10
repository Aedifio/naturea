import { Component, inject } from '@angular/core';
import { RecrutFileViewerService } from '../services/recrut-file-viewer.service';

@Component({
  selector: 'app-recrut-file-viewer',
  standalone: true,
  template: `
    @if (viewer.open()) {
      <div class="fv-overlay on">
        <div class="fv-box">
          <div class="fv-header">
            <h3>{{ viewer.label() }} — {{ viewer.file()?.name }}</h3>
            <div class="fv-header-btns">
              <button type="button" class="btn btn-outline btn-sm" (click)="viewer.download()">⬇ Télécharger</button>
              <button type="button" class="btn btn-danger btn-sm" (click)="viewer.close()">✕ Fermer</button>
            </div>
          </div>
          <div class="fv-body">
            @if (viewer.file(); as file) {
              @if (file.dataUrl && file.type.startsWith('image/')) {
                <img [src]="file.dataUrl" [alt]="file.name" />
              } @else if (file.dataUrl && file.type === 'application/pdf') {
                <iframe [src]="file.dataUrl" [title]="file.name"></iframe>
              } @else if (file.dataUrl) {
                <div class="fv-placeholder">
                  <div class="ei">📄</div>
                  <p><strong>{{ file.name }}</strong></p>
                  <p style="margin-top:8px;font-size:13px">Aperçu non disponible pour ce type de fichier.</p>
                  <p style="margin-top:16px">
                    <button type="button" class="btn btn-primary" (click)="viewer.download()">⬇ Télécharger le fichier</button>
                  </p>
                </div>
              } @else {
                <div class="fv-placeholder">
                  <div class="ei">📄</div>
                  <p>Fichier non disponible en aperçu.</p>
                </div>
              }
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class RecrutFileViewerComponent {
  readonly viewer = inject(RecrutFileViewerService);
}
