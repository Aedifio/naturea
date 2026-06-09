import { Component, computed, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AgencyService } from '../../core/services/agency.service';
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
  private readonly agencyService = inject(AgencyService);

  readonly open = input(false);
  readonly mode = input<AdminUserModalMode>('edit');
  readonly user = input<PortalUserRow | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly agencies = computed(() => {
    this.agencyService.agencies();
    return this.agencyService.getAll();
  });

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
          franchise: this.franchiseForForm(u.franchise),
          actif: u.actif,
        });
        // Password is optional when editing: leaving it empty keeps the current one.
        // It can only be changed for users with a linked Auth account.
        if (u.auth_user_id) {
          this.form.controls.password.setValidators([Validators.minLength(6)]);
          this.form.controls.email.enable();
        } else {
          this.form.controls.password.clearValidators();
          this.form.controls.email.disable();
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
        password: raw.password.trim() ? raw.password : undefined,
      });
    }
  }

  private franchiseForForm(franchise: string): string {
    if (!franchise || franchise === '(siège)') return '(siège)';
    return this.agencyService.resolveFranchiseName(franchise) ?? '(siège)';
  }
}
