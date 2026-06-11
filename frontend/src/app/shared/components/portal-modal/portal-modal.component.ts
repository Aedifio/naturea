import { Component, computed, inject } from '@angular/core';
import { input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PORTAL_ACTU_CATS } from '../../../core/constants/portal-actu-cats.constants';
import { PORTAL_EVENT_TAGS } from '../../../core/constants/portal-event-tags.constants';
import { PortalContentService } from '../../../core/services/portal-content.service';

export type PortalModalType = 'actu' | 'event' | 'newsletter-text';

@Component({
  selector: 'app-portal-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    @if (open()) {
      <div class="modal-bg on" (click)="onBackdrop($event)">
        <div class="modal-box" role="dialog" aria-modal="true">
          <div class="modal-h">
            <h3>{{ modalTitle() }}</h3>
            <button type="button" class="modal-x" (click)="close.emit()" aria-label="Fermer">×</button>
          </div>

          @if (type() === 'actu') {
            <form class="modal-b" [formGroup]="actuForm" (ngSubmit)="saveActu()">
              <div class="modal-row">
                <div class="modal-field">
                  <label for="m-cat">Catégorie</label>
                  <select id="m-cat" formControlName="cat">
                    @for (c of actuCats; track c.value) {
                      <option [value]="c.value">{{ c.label }}</option>
                    }
                  </select>
                </div>
                <div class="modal-field">
                  <label for="m-date">Date</label>
                  <input id="m-date" type="date" formControlName="date" autocomplete="off" data-lpignore="true" data-form-type="other" />
                </div>
              </div>
              <div class="modal-field">
                <label for="m-title">Titre</label>
                <input id="m-title" type="text" formControlName="title" placeholder="Ex: Lancement campagne printemps" autocomplete="off" data-lpignore="true" data-form-type="other" />
              </div>
              <div class="modal-field">
                <label for="m-body">Contenu</label>
                <textarea id="m-body" formControlName="body" placeholder="Quelques lignes pour résumer..."></textarea>
              </div>
              <div class="modal-f">
                <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
                <button type="submit" class="btn-save" [disabled]="actuForm.invalid">Publier</button>
              </div>
            </form>
          }

          @if (type() === 'event') {
            <form class="modal-b" [formGroup]="eventForm" (ngSubmit)="saveEvent()">
              <div class="modal-row">
                <div class="modal-field">
                  <label for="m-edate">Date</label>
                  <input id="m-edate" type="date" formControlName="date" autocomplete="off" data-lpignore="true" data-form-type="other" />
                </div>
                <div class="modal-field">
                  <label for="m-etag">Type</label>
                  <select id="m-etag" formControlName="tag">
                    @for (t of eventTags; track t.value) {
                      <option [value]="t.value">{{ t.label }}</option>
                    }
                  </select>
                </div>
              </div>
              <div class="modal-field">
                <label for="m-etitle">Titre</label>
                <input id="m-etitle" type="text" formControlName="title" placeholder="Ex: Convention réseau annuelle" autocomplete="off" data-lpignore="true" data-form-type="other" />
              </div>
              <div class="modal-field">
                <label for="m-edetail">Détails (lieu, horaires, participants)</label>
                <input id="m-edetail" type="text" formControlName="detail" placeholder="Ex: Hôtel Mercure — Lyon · 9h–18h" autocomplete="off" data-lpignore="true" data-form-type="other" />
              </div>
              <div class="modal-f">
                <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
                <button type="submit" class="btn-save" [disabled]="eventForm.invalid">Publier</button>
              </div>
            </form>
          }

          @if (type() === 'newsletter-text') {
            <form class="modal-b" [formGroup]="nlForm" (ngSubmit)="saveNewsletter()">
              <div class="modal-field">
                <label for="m-nl-name">Titre / Numéro</label>
                <input id="m-nl-name" type="text" formControlName="name" placeholder="Ex: Newsletter Mai 2026 — n°23"autocomplete="off" data-lpignore="true" data-form-type="other" />
              </div>
              <div class="modal-field">
                <label for="m-nl-body">Contenu</label>
                <textarea id="m-nl-body" class="nl-textarea" formControlName="body" placeholder="Colle ici le texte de la newsletter..."></textarea>
              </div>
              <div class="modal-f">
                <button type="button" class="btn-cancel" (click)="close.emit()">Annuler</button>
                <button type="submit" class="btn-save" [disabled]="nlForm.invalid">Publier</button>
              </div>
            </form>
          }
        </div>
      </div>
    }
  `,
  styles: `
    .modal-bg {
      position: fixed;
      inset: 0;
      background: rgba(31, 46, 37, 0.6);
      z-index: 3000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-box {
      background: var(--surface);
      border-radius: 13px;
      width: 100%;
      max-width: 540px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }
    .modal-h {
      padding: 18px 22px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .modal-h h3 {
      font-family: var(--serif);
      font-size: 18px;
      color: var(--ink);
      font-weight: 600;
    }
    .modal-x {
      background: none;
      border: none;
      font-size: 22px;
      cursor: pointer;
      color: var(--subtle);
      padding: 0;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-x:hover {
      background: var(--bg);
      color: var(--ink);
    }
    .modal-b {
      padding: 18px 22px 0;
    }
    .modal-f {
      padding: 14px 22px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      background: var(--bg);
      margin: 0 -22px;
    }
    .modal-field {
      margin-bottom: 14px;
    }
    .modal-field label {
      display: block;
      font-size: 11.5px;
      color: var(--muted);
      font-weight: 600;
      margin-bottom: 5px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .modal-field input,
    .modal-field select,
    .modal-field textarea {
      width: 100%;
      padding: 9px 12px;
      border: 1px solid var(--border);
      border-radius: 7px;
      font-family: var(--sans);
      font-size: 13.5px;
      color: var(--ink);
      background: var(--surface);
    }
    .modal-field input:focus,
    .modal-field select:focus,
    .modal-field textarea:focus {
      outline: none;
      border-color: var(--accent);
    }
    .modal-field textarea {
      resize: vertical;
      min-height: 90px;
    }
    .nl-textarea {
      min-height: 240px !important;
    }
    .modal-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .btn-cancel {
      background: none;
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 8px 16px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 13px;
      font-family: var(--sans);
      font-weight: 500;
    }
    .btn-cancel:hover {
      background: var(--bg);
      color: var(--ink);
    }
    .btn-save {
      background: var(--accent);
      color: #fff;
      border: none;
      padding: 8px 18px;
      border-radius: 7px;
      cursor: pointer;
      font-size: 13px;
      font-family: var(--sans);
      font-weight: 600;
    }
    .btn-save:hover:not(:disabled) {
      background: var(--accent-ink);
    }
    .btn-save:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `,
})
export class PortalModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly content = inject(PortalContentService);

  readonly type = input.required<PortalModalType>();
  readonly open = input(false);
  readonly close = output<void>();

  readonly actuCats = PORTAL_ACTU_CATS;
  readonly eventTags = PORTAL_EVENT_TAGS;

  readonly modalTitle = computed(() => {
    switch (this.type()) {
      case 'actu':
        return 'Nouvelle actualité';
      case 'event':
        return 'Nouvel événement';
      case 'newsletter-text':
        return 'Newsletter (texte)';
    }
  });

  readonly actuForm = this.fb.group({
    cat: ['reseau', Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    title: ['', Validators.required],
    body: ['', Validators.required],
  });

  readonly eventForm = this.fb.group({
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    tag: ['formation', Validators.required],
    title: ['', Validators.required],
    detail: ['', Validators.required],
  });

  readonly nlForm = this.fb.group({
    name: ['', Validators.required],
    body: ['', Validators.required],
  });

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-bg')) {
      this.close.emit();
    }
  }

  async saveActu(): Promise<void> {
    if (this.actuForm.invalid) return;
    const v = this.actuForm.getRawValue();
    await this.content.addActu({
      cat: v.cat!,
      dateIso: v.date!,
      title: v.title!.trim(),
      body: v.body!.trim(),
    });
    this.actuForm.reset({
      cat: 'reseau',
      date: new Date().toISOString().slice(0, 10),
      title: '',
      body: '',
    });
    this.close.emit();
  }

  async saveEvent(): Promise<void> {
    if (this.eventForm.invalid) return;
    const v = this.eventForm.getRawValue();
    await this.content.addEvent({
      dateIso: v.date!,
      tag: v.tag!,
      title: v.title!.trim(),
      detail: v.detail!.trim(),
    });
    this.eventForm.reset({
      date: new Date().toISOString().slice(0, 10),
      tag: 'formation',
      title: '',
      detail: '',
    });
    this.close.emit();
  }

  async saveNewsletter(): Promise<void> {
    if (this.nlForm.invalid) return;
    const v = this.nlForm.getRawValue();
    await this.content.saveNewsletter({
      type: 'text',
      name: v.name!.trim(),
      content: v.body!.trim(),
      dateIso: new Date().toISOString().slice(0, 10),
    });
    this.nlForm.reset({ name: '', body: '' });
    this.close.emit();
  }
}
