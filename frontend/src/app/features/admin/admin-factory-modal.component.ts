import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Factory, FactoryCreate, FactoryUpdate } from '../../core/models/factory.model';

export type AdminFactoryModalMode = 'create' | 'edit';

const KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

@Component({
  selector: 'app-admin-factory-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-factory-modal.component.html',
  styleUrl: './admin-factory-modal.component.scss',
})
export class AdminFactoryModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly mode = input<AdminFactoryModalMode>('edit');
  readonly factory = input<Factory | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly saveCreate = output<FactoryCreate>();
  readonly saveEdit = output<FactoryUpdate>();

  readonly form = this.fb.nonNullable.group({
    key: ['', [Validators.required, Validators.pattern(KEY_PATTERN)]],
    nom: ['', Validators.required],
    couleur: ['#2B4A1A', [Validators.required, Validators.pattern(HEX_COLOR_PATTERN)]],
    description: [''],
    address: [''],
    contact_email: [''],
    actif: [true],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const isCreate = this.mode() === 'create';
      const f = this.factory();

      if (isCreate) {
        this.form.reset({
          key: '',
          nom: '',
          couleur: '#2B4A1A',
          description: '',
          address: '',
          contact_email: '',
          actif: true,
        });
        this.form.controls.key.enable();
      } else if (f) {
        this.form.reset({
          key: f.key,
          nom: f.nom,
          couleur: f.couleur,
          description: f.description ?? '',
          address: f.address ?? '',
          contact_email: f.contact_email ?? '',
          actif: f.actif,
        });
        this.form.controls.key.disable();
      }
    });
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) {
      this.close.emit();
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    if (this.mode() === 'create') {
      this.saveCreate.emit({
        key: raw.key.trim(),
        nom: raw.nom.trim(),
        couleur: raw.couleur.trim(),
        description: raw.description.trim(),
        address: raw.address.trim(),
        contact_email: raw.contact_email.trim(),
        actif: raw.actif,
      });
    } else {
      this.saveEdit.emit({
        nom: raw.nom.trim(),
        couleur: raw.couleur.trim(),
        description: raw.description.trim(),
        address: raw.address.trim(),
        contact_email: raw.contact_email.trim(),
        actif: raw.actif,
      });
    }
  }
}
