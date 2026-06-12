import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  FACTORY_MANAGER_ROLE,
  FRANCHISEE_ROLE,
  isFactoryManagerRole,
  isFranchiseeRole,
} from '../../core/constants/portal-roles.constants';
import { FactoryService } from '../../core/services/factory.service';
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly permissions = inject(PortalPermissionsService);
  private readonly agencyService = inject(AgencyService);
  private readonly factoryService = inject(FactoryService);

  readonly open = input(false);
  readonly mode = input<AdminUserModalMode>('edit');
  readonly user = input<PortalUserRow | null>(null);
  readonly saving = input(false);
  readonly error = input<string | null>(null);

  readonly agencies = computed(() => {
    this.agencyService.agencies();
    return this.agencyService.getAll();
  });

  readonly factories = computed(() => {
    this.factoryService.factories();
    return this.factoryService.getAll();
  });

  readonly close = output<void>();
  readonly saveCreate = output<PortalUserCreate>();
  readonly saveEdit = output<PortalUserUpdate>();

  readonly roles = computed(() => this.permissions.portalRoles());
  readonly franchiseeRole = FRANCHISEE_ROLE;
  readonly factoryManagerRole = FACTORY_MANAGER_ROLE;

  readonly agencyFieldVisible = signal(false);
  readonly factoryFieldVisible = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    name: ['', Validators.required],
    role_id: ['', Validators.required],
    agency_id: [null as number | null],
    factory_id: [null as number | null],
    actif: [true],
  });

  constructor() {
    this.form.controls.role_id.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((roleId) => this.onRoleChanged(roleId));

    effect(() => {
      if (!this.open()) {
        this.agencyFieldVisible.set(false);
        this.factoryFieldVisible.set(false);
        return;
      }

      const isCreate = this.mode() === 'create';
      const u = this.user();

      if (isCreate) {
        const defaultRole =
          this.roles().find((r) => r.name === 'Franchisé') ?? this.roles()[0];
        this.form.reset({
          email: '',
          password: '',
          name: '',
          role_id: defaultRole?.id ?? '',
          agency_id: null,
          factory_id: null,
          actif: true,
        });
        this.form.controls.email.enable();
        this.form.controls.password.setValidators([Validators.required, Validators.minLength(6)]);
      } else if (u) {
        this.form.reset({
          email: u.email ?? '',
          password: '',
          name: u.name,
          role_id: u.role_id,
          agency_id: u.agency_id,
          factory_id: u.factory_id,
          actif: u.actif,
        });
        if (u.auth_user_id) {
          this.form.controls.password.setValidators([Validators.minLength(6)]);
          this.form.controls.email.enable();
        } else {
          this.form.controls.password.clearValidators();
          this.form.controls.email.disable();
        }
      }
      this.form.controls.password.updateValueAndValidity();
      this.onRoleChanged(this.form.controls.role_id.value);
      this.cdr.markForCheck();
    });
  }

  onRoleChange(event: Event): void {
    this.onRoleChanged((event.target as HTMLSelectElement).value);
  }

  onBackdrop(e: MouseEvent): void {
    if ((e.target as HTMLElement).classList.contains('modal-bg')) {
      this.close.emit();
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const raw = this.form.getRawValue();
    const roleName = this.roleName(raw.role_id);
    const agency_id = isFranchiseeRole(roleName) ? raw.agency_id : null;
    const factory_id = isFactoryManagerRole(roleName) ? raw.factory_id : null;
    if (this.mode() === 'create') {
      this.saveCreate.emit({
        email: raw.email,
        password: raw.password,
        name: raw.name,
        role_id: raw.role_id,
        agency_id,
        factory_id,
        actif: raw.actif,
      });
    } else {
      this.saveEdit.emit({
        email: raw.email,
        name: raw.name,
        role_id: raw.role_id,
        agency_id,
        factory_id,
        actif: raw.actif,
        password: raw.password.trim() ? raw.password : undefined,
      });
    }
  }

  private roleName(roleId: string): string {
    return this.roles().find((r) => r.id === roleId)?.name ?? '';
  }

  private onRoleChanged(roleId: string): void {
    const roleName = this.roleName(roleId);
    this.agencyFieldVisible.set(isFranchiseeRole(roleName));
    this.factoryFieldVisible.set(isFactoryManagerRole(roleName));
    this.applyAgencyRules(roleName);
    this.applyFactoryRules(roleName);
    this.cdr.markForCheck();
  }

  private applyAgencyRules(roleName: string): void {
    const fc = this.form.controls.agency_id;
    if (isFranchiseeRole(roleName)) {
      fc.setValidators([Validators.required]);
    } else {
      fc.clearValidators();
      if (fc.value != null) fc.setValue(null, { emitEvent: false });
    }
    fc.updateValueAndValidity({ emitEvent: false });
  }

  private applyFactoryRules(roleName: string): void {
    const fc = this.form.controls.factory_id;
    if (isFactoryManagerRole(roleName)) {
      fc.setValidators([Validators.required]);
    } else {
      fc.clearValidators();
      if (fc.value != null) fc.setValue(null, { emitEvent: false });
    }
    fc.updateValueAndValidity({ emitEvent: false });
  }
}
