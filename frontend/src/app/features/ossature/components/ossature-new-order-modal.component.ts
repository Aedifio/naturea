import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DOCS_REQUIS } from '../constants/ossature.constants';
import { AgencyService } from '../../../core/services/agency.service';
import { FactoryService } from '../../../core/services/factory.service';
import { OssatureDataService } from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';
import { OssatureModeService } from '../services/ossature-mode.service';
import { OssatureToastService } from '../services/ossature-toast.service';

@Component({
  selector: 'app-ossature-new-order-modal',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (open()) {
      <div class="modal-overlay" (click)="onOverlay($event)">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="modal-title">Nouvelle commande</div>
            <button type="button" class="modal-close" (click)="close()">✕</button>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Référence maison / plan *</label>
              <input class="form-input" [(ngModel)]="reference" placeholder="ex: VILLA-MODERNA-2025" autocomplete="off" data-lpignore="true" data-form-type="other" />
            </div>
            <div class="form-group">
              <label class="form-label">Surface de murs *</label>
              <input class="form-input" [(ngModel)]="surface" placeholder="ex: 142 m²" autocomplete="off" data-lpignore="true" data-form-type="other" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Surface plancher</label>
              <input class="form-input" [(ngModel)]="plancher" placeholder="ex: 98 m²" autocomplete="off" data-lpignore="true" data-form-type="other" />
            </div>
            <div class="form-group"></div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Date de livraison souhaitée *</label>
              <input class="form-input" type="date" [(ngModel)]="livraison" [min]="minLivraison" autocomplete="off" data-lpignore="true" data-form-type="other" />
            </div>
            <div class="form-group">
              <label class="form-label">Date dépôt permis de construire</label>
              <input class="form-input" type="date" [(ngModel)]="permis" autocomplete="off" data-lpignore="true" data-form-type="other" />
            </div>
          </div>
          @if (showFranchiseField()) {
            <div class="form-group">
              <label class="form-label">Franchisé</label>
              <select class="form-select" [(ngModel)]="franchise">
                @for (f of franchises(); track f) {
                  <option [value]="f">{{ f }}</option>
                }
              </select>
            </div>
          }
          <div class="form-group">
            <label class="form-label">Site de production</label>
            <select class="form-select" [(ngModel)]="site">
              @for (s of sites(); track s) {
                <option [value]="s">{{ s }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              Pièces à joindre
              <span style="color: #ef4444; font-size: 11px; font-weight: 600">* toutes obligatoires</span>
            </label>
            <div style="display: flex; flex-direction: column; gap: 8px">
              @for (doc of docsRequis; track doc.id) {
                <div
                  class="doc-row"
                  [class.joined]="docsJoints()[doc.id]"
                  [class.missing]="showWarn() && !docsJoints()[doc.id]"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event, doc.id)"
                  (drop)="onDrop($event, doc.id)"
                >
                  <label class="doc-row-label">
                    <input type="file" accept="image/*,.pdf,.doc,.docx,.dwg" hidden #fileInput (change)="onFile(doc.id, fileInput)" />
                    <span style="font-size: 20px">{{ docsJoints()[doc.id] ? '✅' : '📎' }}</span>
                    <span style="flex: 1; font-size: 13px">
                      <strong>{{ doc.label }}</strong><br />
                      <span style="font-size: 11px; color: #9ca3af">{{ docsJoints()[doc.id] || 'Appuyer ici pour joindre' }}</span>
                    </span>
                    <span class="join-btn" [class.done]="!!docsJoints()[doc.id]" (click)="fileInput.click(); $event.preventDefault()">
                      {{ docsJoints()[doc.id] ? '✓ Joint' : 'Joindre' }}
                    </span>
                  </label>
                  @if (docsJoints()[doc.id]) {
                    <div class="doc-del-row">
                      <button type="button" class="doc-del-btn" (click)="removeDoc(doc.id)">🗑 Supprimer</button>
                    </div>
                  }
                </div>
              }
            </div>
            @if (showWarn()) {
              <div style="margin-top: 8px; padding: 9px 13px; background: #fef2f2; border-radius: 8px; color: #dc2626; font-size: 12px; font-weight: 600">
                ⚠️ Toutes les pièces doivent être jointes avant de valider
              </div>
            }
          </div>
          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="close()">Annuler</button>
            <button type="button" class="btn-save" (click)="save()">✓ Créer la commande</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .doc-row {
      border: 1.5px solid var(--border);
      border-radius: 9px;
      overflow: hidden;
      margin-bottom: 4px;
    }
    .doc-row.joined {
      border-color: var(--green);
    }
    .doc-row.missing {
      border-color: #ef4444;
    }
    .doc-row-label {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: #f9fafb;
      cursor: pointer;
      width: 100%;
      box-sizing: border-box;
    }
    .join-btn {
      background: #eef2ff;
      color: #3b6fe8;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      flex-shrink: 0;
    }
    .join-btn.done {
      background: #d1fae5;
      color: #065f46;
    }
    .doc-del-row {
      padding: 4px 12px 8px;
      background: #f0fdf4;
    }
    .doc-del-btn {
      background: #fef2f2;
      color: #dc2626;
      border: none;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  `,
})
export class OssatureNewOrderModalComponent {
  private readonly modals = inject(OssatureModalService);
  private readonly mode = inject(OssatureModeService);
  private readonly data = inject(OssatureDataService);
  private readonly toast = inject(OssatureToastService);
  private readonly factory = inject(FactoryService);
  private readonly agencies = inject(AgencyService);

  readonly franchises = computed(() => {
    this.agencies.agencies();
    return this.agencies.getNames();
  });
  readonly sites = computed(() => this.factory.getOssatureSites());
  readonly docsRequis = DOCS_REQUIS;

  readonly open = computed(() => this.modals.newOrderOpen());
  readonly showFranchiseField = computed(() => this.modals.newOrderContext() === 'coord');

  reference = '';
  surface = '';
  plancher = '';
  livraison = '';
  permis = '';
  franchise = '';
  site = '';
  readonly minLivraison = this.computeMinLivraison();

  readonly docsJoints = signal<Record<string, string>>({});
  readonly showWarn = signal(false);

  constructor() {
    effect(() => {
      if (this.open()) this.resetForm();
    });
  }

  private resetForm(): void {
    this.reference = '';
    this.surface = '';
    this.plancher = '';
    this.permis = '';
    this.site = this.factory.getOssatureSites()[0] ?? '';
    this.livraison = this.minLivraison;
    this.franchise = this.mode.selectedFranchise() || this.agencies.getNames()[0] || '';
    this.docsJoints.set({});
    this.showWarn.set(false);
  }

  private computeMinLivraison(): string {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 70);
    return minDate.toISOString().slice(0, 10);
  }

  onFile(docId: string, input: HTMLInputElement): void {
    if (input.files?.[0]) {
      this.docsJoints.update((m) => ({ ...m, [docId]: input.files![0].name }));
      this.showWarn.set(false);
    }
  }

  removeDoc(docId: string): void {
    this.docsJoints.update((m) => {
      const next = { ...m };
      delete next[docId];
      return next;
    });
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
  }

  onDragLeave(e: DragEvent, docId: string): void {
    (e.currentTarget as HTMLElement).style.borderColor = this.docsJoints()[docId] ? 'var(--green)' : 'var(--border)';
  }

  onDrop(e: DragEvent, docId: string): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
    const f = e.dataTransfer?.files[0];
    if (f) this.docsJoints.update((m) => ({ ...m, [docId]: f.name }));
  }

  save(): void {
    const allJoined = DOCS_REQUIS.every((d) => this.docsJoints()[d.id]);
    if (!allJoined) {
      this.showWarn.set(true);
      return;
    }
    if (!this.reference.trim() || !this.surface.trim() || !this.livraison) {
      alert('Veuillez remplir les champs obligatoires (*)');
      return;
    }
    const franchise =
      this.modals.newOrderContext() === 'franchise' ? this.mode.selectedFranchise() : this.franchise;
    const docs = DOCS_REQUIS.map((d) => this.docsJoints()[d.id]).filter(Boolean);
    const order = this.data.createOrder({
      franchise,
      reference: this.reference.trim(),
      surface: this.surface.trim(),
      plancher: this.plancher.trim(),
      site: this.site,
      livraison: this.livraison,
      permis: this.permis,
      docs,
    });
    this.modals.closeNewOrder();
    this.toast.show(`✅ Commande ${order.reference} créée — notification email envoyée au coordinateur et à l'usine`);
  }

  close(): void {
    this.modals.closeNewOrder();
  }

  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }
}
