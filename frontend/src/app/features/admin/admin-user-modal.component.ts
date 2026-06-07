import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PortalPermissionsService } from '../../core/services/portal-permissions.service';
import type {
  PortalUserCreate,
  PortalUserRow,
  PortalUserUpdate,
} from '../../core/services/portal-users.service';

export type AdminUserModalMode = 'create' | 'edit';

@Component({
  selector: 'app-admin-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin-user-modal.component.html',
  styleUrl: './admin-user-modal.component.scss',
})
export class AdminUserModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly permissions = inject(PortalPermissionsService);

  readonly open = input(false);
  readonly mode = input<AdminUserModalMode>('edit');
  readonly user = input<PortalUserRow | null>(null);
  readonly franchiseOptions = input<string[]>(['(siège)']);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly close = output<void>();
  readonly saveCreate = output<PortalUserCreate>();
  readonly saveEdit = output<PortalUserUpdate>();

  readonly roles = computed(() => this.permissions.knownRoles());

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    name: ['', Validators.required],
    role: ['Franchisé', Validators.required],
    franchise: ['(siège)', Validators.required],
    actif: [true],
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const isCreate = this.mode() === 'create';
      const u = this.user();

      if (isCreate) {
        this.form.reset({
          email: '',
          password: '',
          name: '',
          role: 'Franchisé',
          franchise: '(siège)',
          actif: true,
        });
        this.form.controls.email.enable();
        this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
      } else if (u) {
        this.form.reset({
          email: u.email ?? '',
          password: '',
          name: u.name,
          role: u.role,
          franchise: u.franchise,
          actif: u.actif,
        });
        this.form.controls.password.clearValidators();
        if (!u.auth_user_id) {
          this.form.controls.email.disable();
        } else {
          this.form.controls.email.enable();
        }
      }
      this.form.controls.password.updateValueAndValidity();
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
        email: raw.email,
        password: raw.password,
        name: raw.name,
        role: raw.role,
        franchise: raw.franchise,
        actif: raw.actif,
      });
    } else {
      this.saveEdit.emit({
        email: raw.email,
        name: raw.name,
        role: raw.role,
        franchise: raw.franchise,
        actif: raw.actif,
      });
    }
  }
}
