import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Agency, AgencyCreate, AgencyUpdate } from '../../core/models/agency.model';

export type AdminAgencyModalMode = 'create' | 'edit';

@Component({
  selector: 'app-admin-agency-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-agency-modal.component.html',
  styleUrl: './admin-agency-modal.component.scss',
})
export class AdminAgencyModalComponent {
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly mode = input<AdminAgencyModalMode>('edit');
  readonly agency = input<Agency | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly saveCreate = output<AgencyCreate>();
  readonly saveEdit = output<AgencyUpdate>();

  readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    ville: [''],
    adresse: [''],
    contact_email: ['', Validators.email],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const isCreate = this.mode() === 'create';
      const a = this.agency();

      if (isCreate) {
        this.form.reset({ name: '', ville: '', adresse: '', contact_email: '' });
      } else if (a) {
        this.form.reset({
          name: a.name,
          ville: a.ville ?? '',
          adresse: a.adresse ?? '',
          contact_email: a.contact_email ?? '',
        });
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
    const payload = {
      name: raw.name.trim(),
      ville: raw.ville.trim(),
      adresse: raw.adresse.trim(),
      contact_email: raw.contact_email.trim(),
    };
    if (this.mode() === 'create') {
      this.saveCreate.emit(payload);
    } else {
      this.saveEdit.emit(payload);
    }
  }
}
