import { Component, inject, input, signal, viewChild } from '@angular/core';
import { DOC_CATS } from '../constants/recrutement-doc.constants';
import { Candidate } from '../recrutement.models';
import { RecrutDiscTestComponent } from './recrut-disc-test.component';
import { RecrutQuestionnaireComponent } from './recrut-questionnaire.component';
import { RecrutFileViewerService } from '../services/recrut-file-viewer.service';
import { RecrutementDataService } from '../services/recrutement-data.service';
import { RecrutementModeService } from '../services/recrutement-mode.service';
import { RecrutementToastService } from '../services/recrutement-toast.service';

@Component({
  selector: 'app-recrut-doc-list',
  standalone: true,
  imports: [RecrutDiscTestComponent, RecrutQuestionnaireComponent],
  template: `
    @if (candidate(); as c) {
      @for (cat of DOC_CATS; track cat.cat) {
        <div class="doc-section">
          <div class="doc-section-title">{{ cat.cat }}</div>
          <div class="doc-list">
            @for (doc of cat.docs; track doc.k) {
              @if (doc.k === '__disc__') {
                <div>
                  <div class="doc-row" [class.has]="!!c.disc" style="align-items:center;flex-wrap:wrap;gap:10px">
                    <div class="doc-row-icon">{{ doc.i }}</div>
                    <div class="doc-row-info">
                      <div class="doc-row-name">{{ doc.l }}</div>
                      <div class="doc-row-file" [class.ok]="!!c.disc">
                        {{ c.disc ? '✅ Test réalisé le ' + c.disc.date : 'Non réalisé' }}
                      </div>
                    </div>
                    <div class="doc-row-actions">
                      @if (c.disc) {
                        <button type="button" class="doc-btn view" (click)="toggleDisc()">👁 Voir résultats</button>
                        @if (!isAdmin()) {
                          <button type="button" class="doc-btn upload" (click)="startDisc()">♻ Refaire</button>
                        }
                      } @else if (!isAdmin()) {
                        <button type="button" class="doc-btn upload" (click)="startDisc()">🧠 Lancer le test</button>
                      } @else {
                        <span style="font-size:12px;color:var(--muted);font-style:italic">En attente du candidat</span>
                      }
                    </div>
                  </div>
                  @if (discOpen()) {
                    <div style="margin:8px 0 16px;padding:0 4px">
                      @if (discMode() === 'result' && c.disc) {
                        <app-recrut-disc-test
                          [candidateId]="c.id"
                          [initialDisc]="c.disc"
                          [showSavedMessage]="false"
                        />
                      } @else if (discMode() === 'test') {
                        <app-recrut-disc-test
                          #discTest
                          [candidateId]="c.id"
                          (finished)="onDiscFinished()"
                        />
                      }
                    </div>
                  }
                </div>
              } @else if (doc.k === '__quest__') {
                <div>
                  <div class="doc-row" [class.has]="!!c.questionnaire" style="align-items:center;flex-wrap:wrap;gap:10px">
                    <div class="doc-row-icon">{{ doc.i }}</div>
                    <div class="doc-row-info">
                      <div class="doc-row-name">{{ doc.l }}</div>
                      <div class="doc-row-file" [class.ok]="!!c.questionnaire">
                        {{ c.questionnaire ? '✅ Complété le ' + c.questionnaire.date : 'Non rempli' }}
                      </div>
                    </div>
                    <div class="doc-row-actions">
                      @if (c.questionnaire) {
                        <button type="button" class="doc-btn view" (click)="toggleQuestRecap()">👁 Voir réponses</button>
                        @if (isAdmin()) {
                          <button type="button" class="doc-btn dl" (click)="printQuest()">🖨 Imprimer / PDF</button>
                        }
                        @if (!isAdmin()) {
                          <button type="button" class="doc-btn upload" (click)="editQuest()">✏️ Modifier</button>
                        }
                      } @else if (!isAdmin()) {
                        <button type="button" class="doc-btn upload" (click)="editQuest()">📋 Remplir</button>
                      } @else {
                        <span style="font-size:12px;color:var(--muted);font-style:italic">En attente du candidat</span>
                      }
                    </div>
                  </div>
                  @if (questOpen()) {
                    <div style="margin:8px 0 16px;padding:0 4px">
                      <app-recrut-questionnaire
                        #questPanel
                        [candidateId]="c.id"
                        [mode]="questMode()"
                        (saved)="onQuestSaved()"
                      />
                    </div>
                  }
                </div>
              } @else {
                <div class="doc-row" [class.has]="!!c.documents[doc.k]">
                  <div class="doc-row-icon">{{ doc.i }}</div>
                  <div class="doc-row-info">
                    <div class="doc-row-name">{{ doc.l }}</div>
                    <div class="doc-row-file" [class.ok]="!!c.documents[doc.k]">
                      @if (c.documents[doc.k]; as file) {
                        📎 {{ file.name }}
                      } @else {
                        Aucun fichier déposé
                      }
                    </div>
                  </div>
                  <div class="doc-row-actions">
                    @if (c.documents[doc.k]; as file) {
                      <button type="button" class="doc-btn view" (click)="viewFile(file, doc.l)">👁 Voir</button>
                      <button type="button" class="doc-btn dl" (click)="downloadFile(file)">⬇ Télécharger</button>
                      @if (!readOnly()) {
                        <button type="button" class="doc-btn upload" (click)="triggerUpload(doc.k)">♻ Remplacer</button>
                        <button type="button" class="doc-btn del" (click)="deleteDoc(doc.k)">✕</button>
                      }
                    } @else if (!readOnly()) {
                      <button type="button" class="doc-btn upload" (click)="triggerUpload(doc.k)">📤 Déposer</button>
                    }
                  </div>
                  @if (!readOnly()) {
                    <input
                      type="file"
                      style="display:none"
                      [id]="fileInputId(doc.k)"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                      (change)="onFileSelected(doc.k, $event)"
                    />
                  }
                </div>
              }
            }
          </div>
        </div>
      }
    }
  `,
})
export class RecrutDocListComponent {
  private readonly data = inject(RecrutementDataService);
  private readonly mode = inject(RecrutementModeService);
  private readonly toast = inject(RecrutementToastService);
  private readonly viewer = inject(RecrutFileViewerService);

  readonly DOC_CATS = DOC_CATS;
  readonly candidateId = input.required<string>();
  readonly readOnly = input(false);

  readonly discOpen = signal(false);
  readonly discMode = signal<'test' | 'result'>('result');
  readonly questOpen = signal(false);
  readonly questMode = signal<'edit' | 'recap'>('recap');

  readonly discTest = viewChild<RecrutDiscTestComponent>('discTest');
  readonly questPanel = viewChild<RecrutQuestionnaireComponent>('questPanel');

  candidate = () => this.data.getById(this.candidateId());
  isAdmin = () => this.mode.isAdmin();

  fileInputId(key: string): string {
    return `df-${this.candidateId()}-${key}`;
  }

  triggerUpload(key: string): void {
    document.getElementById(this.fileInputId(key))?.click();
  }

  onFileSelected(key: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      this.data.setDocument(this.candidateId(), key, {
        name: file.name,
        dataUrl: String(reader.result),
        type: file.type,
      });
      this.toast.show(`📄 ${file.name} ajouté`);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  deleteDoc(key: string): void {
    if (!confirm('Supprimer ce document ?')) return;
    this.data.deleteDocument(this.candidateId(), key);
    this.toast.show('Document supprimé');
  }

  viewFile(file: Candidate['documents'][string], label: string): void {
    this.viewer.show(file, label);
  }

  downloadFile(file: Candidate['documents'][string]): void {
    if (!file.dataUrl) return;
    const anchor = document.createElement('a');
    anchor.href = file.dataUrl;
    anchor.download = file.name;
    anchor.click();
  }

  toggleDisc(): void {
    this.discOpen.update((v) => !v);
    if (this.discOpen()) this.discMode.set('result');
  }

  startDisc(): void {
    this.discOpen.set(true);
    this.discMode.set('test');
    queueMicrotask(() => this.discTest()?.start());
  }

  onDiscFinished(): void {
    this.discMode.set('result');
  }

  toggleQuestRecap(): void {
    const open = !this.questOpen();
    this.questOpen.set(open);
    if (open) this.questMode.set('recap');
  }

  editQuest(): void {
    this.questOpen.set(true);
    this.questMode.set('edit');
    queueMicrotask(() => this.questPanel()?.loadForm());
  }

  onQuestSaved(): void {
    this.questMode.set('recap');
  }

  printQuest(): void {
    this.questOpen.set(true);
    this.questMode.set('recap');
    queueMicrotask(() => this.questPanel()?.printPdf());
  }
}
