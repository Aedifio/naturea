import { Component, computed, effect, ElementRef, inject, signal, viewChild } from '@angular/core';
import { DOCS_SIGNATURE } from '../constants/ossature.constants';
import { OssatureDataService } from '../services/ossature-data.service';
import { OssatureModalService } from '../services/ossature-modal.service';
import { OssatureToastService } from '../services/ossature-toast.service';

@Component({
  selector: 'app-ossature-signature-modal',
  standalone: true,
  template: `
    @if (open()) {
      <div class="modal-overlay" (click)="onOverlay($event)">
        <div class="modal" style="max-width: 500px" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div>
              <div class="modal-title">{{ title() }}</div>
              @if (order()) {
                <div style="font-size: 13px; color: var(--muted); margin-top: 3px">{{ order()!.reference }} — {{ order()!.franchise }}</div>
                <div style="font-size: 12px; color: var(--faint); margin-top: 2px">{{ datePreview() }}</div>
              }
            </div>
            <button type="button" class="modal-close" (click)="close()">✕</button>
          </div>

          @if (isDevis()) {
            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px">
              @for (doc of docsSignature; track doc.id) {
                <div
                  class="sig-doc-row"
                  [class.joined]="sigDocs()[doc.id]"
                  [class.missing]="showDocWarn() && !sigDocs()[doc.id]"
                  (dragover)="onDragOver($event)"
                  (dragleave)="onDragLeave($event, doc.id)"
                  (drop)="onDrop($event, doc.id)"
                >
                  <div class="sig-doc-icon">{{ sigDocs()[doc.id] ? '📄' : '📎' }}</div>
                  <div style="flex: 1; min-width: 0">
                    <div style="font-weight: 600; font-size: 12px">{{ doc.label }}</div>
                    <div style="font-size: 11px; color: var(--faint); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">
                      {{ sigDocs()[doc.id] || 'Cliquer pour joindre' }}
                    </div>
                  </div>
                  @if (sigDocs()[doc.id]) {
                    <span style="font-size: 13px">✅</span>
                  }
                  <button type="button" class="sig-doc-btn" [class.remove]="!!sigDocs()[doc.id]" (click)="toggleDoc(doc.id)">
                    {{ sigDocs()[doc.id] ? '🗑' : 'Joindre' }}
                  </button>
                  <input type="file" accept=".pdf,.dwg,.png,.jpg,.jpeg" hidden [id]="'sfile-' + doc.id" (change)="onFile(doc.id, $event)" />
                </div>
              }
            </div>
            @if (showDocWarn()) {
              <div style="padding: 8px 12px; background: #fef2f2; border-radius: 8px; color: #dc2626; font-size: 12px; font-weight: 600; margin-bottom: 8px">
                ⚠️ Toutes les pièces doivent être jointes avant de signer
              </div>
            }
            <div style="font-size: 13px; color: var(--muted); margin-bottom: 10px">Signez dans le cadre ci-dessous :</div>
          }

          <canvas
            #canvas
            width="440"
            height="160"
            style="border: 2px solid var(--border); border-radius: 10px; background: #f9fafb; width: 100%; touch-action: none; cursor: crosshair; display: block"
          ></canvas>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px">
            <button type="button" style="background: var(--border); color: var(--muted); border: none; border-radius: 8px; padding: 7px 14px; font-size: 12px; font-weight: 600; cursor: pointer" (click)="clearCanvas()">
              🗑 Effacer
            </button>
            @if (showEmptyWarn()) {
              <div style="font-size: 12px; color: #dc2626">Veuillez signer avant de valider</div>
            }
          </div>
          <div class="form-actions" style="margin-top: 16px">
            <button type="button" class="btn-cancel" (click)="close()">Annuler</button>
            <button type="button" class="btn-save" (click)="save()">✅ Valider la signature</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .sig-doc-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      background: #f9fafb;
      border-radius: 8px;
      border: 1.5px solid var(--border);
      transition: border-color 0.15s, background 0.15s;
    }
    .sig-doc-row.joined {
      border-color: var(--green);
      background: #f0fdf4;
    }
    .sig-doc-row.missing {
      border-color: #ef4444;
    }
    .sig-doc-icon {
      width: 22px;
      height: 22px;
      border-radius: 5px;
      background: var(--border);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      flex-shrink: 0;
    }
    .sig-doc-row.joined .sig-doc-icon {
      background: #d1fae5;
    }
    .sig-doc-btn {
      background: var(--blue-light);
      color: var(--blue);
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 600;
      flex-shrink: 0;
      border: none;
      cursor: pointer;
    }
    .sig-doc-btn.remove {
      background: #fef2f2;
      color: #dc2626;
    }
  `,
})
export class OssatureSignatureModalComponent {
  private readonly modals = inject(OssatureModalService);
  private readonly data = inject(OssatureDataService);
  private readonly toast = inject(OssatureToastService);

  readonly docsSignature = DOCS_SIGNATURE;
  readonly canvasRef = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly open = computed(() => this.modals.signatureOrderId() !== null);
  readonly orderId = computed(() => this.modals.signatureOrderId());
  readonly mode = computed(() => this.modals.signatureMode());
  readonly isDevis = computed(() => this.mode() === 'devis');
  readonly order = computed(() => {
    const id = this.orderId();
    return id ? this.data.getById(id) : undefined;
  });
  readonly title = computed(() =>
    this.isDevis() ? 'Signature du devis' : 'Signature des plans de fabrication',
  );
  readonly datePreview = computed(() => {
    const now = new Date();
    return `Date : ${now.toLocaleDateString('fr-FR')} à ${now.toTimeString().slice(0, 5)}`;
  });

  readonly sigDocs = signal<Record<string, string>>({});
  readonly showDocWarn = signal(false);
  readonly showEmptyWarn = signal(false);

  private drawing = false;
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    effect(() => {
      if (this.open()) {
        this.sigDocs.set({});
        this.showDocWarn.set(false);
        this.showEmptyWarn.set(false);
        setTimeout(() => this.initCanvas(), 0);
      }
    });
  }

  private initCanvas(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    this.clearCanvas();
    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.drawing = true;
      const p = this.getPos(canvas, e);
      this.ctx?.beginPath();
      this.ctx?.moveTo(p.x, p.y);
    };
    const move = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!this.drawing || !this.ctx) return;
      const p = this.getPos(canvas, e);
      this.ctx.lineTo(p.x, p.y);
      this.ctx.stroke();
    };
    const end = () => {
      this.drawing = false;
    };
    canvas.onmousedown = start;
    canvas.onmousemove = move;
    canvas.onmouseup = end;
    canvas.onmouseleave = end;
    canvas.ontouchstart = start;
    canvas.ontouchmove = move;
    canvas.ontouchend = end;
  }

  private getPos(canvas: HTMLCanvasElement, e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const src = 'touches' in e ? e.touches[0] : e;
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    };
  }

  clearCanvas(): void {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas) return;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.strokeStyle = '#1a2236';
    this.ctx.lineWidth = 2.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.showEmptyWarn.set(false);
  }

  private isCanvasBlank(): boolean {
    const canvas = this.canvasRef()?.nativeElement;
    if (!canvas || !this.ctx) return true;
    const pixels = this.ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] > 0) return false;
    }
    return true;
  }

  onFile(docId: string, e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.sigDocs.update((m) => ({ ...m, [docId]: input.files![0].name }));
      this.showDocWarn.set(false);
    }
  }

  toggleDoc(docId: string): void {
    if (this.sigDocs()[docId]) {
      this.sigDocs.update((m) => {
        const next = { ...m };
        delete next[docId];
        return next;
      });
      const input = document.getElementById(`sfile-${docId}`) as HTMLInputElement | null;
      if (input) input.value = '';
    } else {
      document.getElementById(`sfile-${docId}`)?.click();
    }
  }

  onDragOver(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).style.borderColor = 'var(--blue)';
    (e.currentTarget as HTMLElement).style.background = '#eef2ff';
  }

  onDragLeave(e: DragEvent, docId: string): void {
    const el = e.currentTarget as HTMLElement;
    el.style.borderColor = this.sigDocs()[docId] ? 'var(--green)' : 'var(--border)';
    el.style.background = this.sigDocs()[docId] ? '#f0fdf4' : '#f9fafb';
  }

  onDrop(e: DragEvent, docId: string): void {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.style.borderColor = 'var(--border)';
    el.style.background = '#f9fafb';
    const f = e.dataTransfer?.files[0];
    if (f) this.sigDocs.update((m) => ({ ...m, [docId]: f.name }));
  }

  save(): void {
    const id = this.orderId();
    const canvas = this.canvasRef()?.nativeElement;
    if (!id || !canvas) return;

    if (this.isDevis()) {
      const allJoined = DOCS_SIGNATURE.every((d) => this.sigDocs()[d.id]);
      if (!allJoined) {
        this.showDocWarn.set(true);
        return;
      }
    }

    if (this.isCanvasBlank()) {
      this.showEmptyWarn.set(true);
      this.toast.show('⚠️ Veuillez signer avant de valider');
      return;
    }

    const sigData = canvas.toDataURL('image/png');
    if (this.isDevis()) {
      const docsList = DOCS_SIGNATURE.map((d) => this.sigDocs()[d.id]).filter(Boolean);
      this.data.saveSignature(id, sigData, docsList);
    } else {
      this.data.savePlanValidationSignature(id, sigData);
    }
    this.modals.closeSignature();
    this.modals.openDetail(id);
  }

  close(): void {
    this.modals.closeSignature();
  }

  onOverlay(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) this.close();
  }
}
