import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodirMember, CodirDataService, CODIR_MEMBER_COLORS } from '../../core/services/codir-data.service';

@Component({
  selector: 'app-codir-member-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './codir-member-modal.component.html',
  styleUrl: './codir-member-modal.component.scss',
})
export class CodirMemberModalComponent {
  private readonly codir = inject(CodirDataService);

  readonly open = input(false);
  readonly member = input<CodirMember | null>(null);
  readonly close = output<void>();
  readonly saved = output<void>();

  readonly colors = CODIR_MEMBER_COLORS;
  readonly name = signal('');
  readonly role = signal('');
  readonly email = signal('');
  readonly color = signal('');

  readonly isEdit = () => !!this.member()?.id;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const m = this.member();
      this.name.set(m?.name ?? '');
      this.role.set(m?.role ?? '');
      this.email.set(m?.email ?? '');
      this.color.set(m?.color ?? this.codir.defaultMemberColor());
    });
  }

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-bg')) {
      this.close.emit();
    }
  }

  selectColor(c: string): void {
    this.color.set(c);
  }

  save(): void {
    const name = this.name().trim();
    if (!name) return;
    const m = this.member();
    this.codir.saveMember({
      id: m?.id,
      name,
      role: this.role(),
      email: this.email(),
      color: this.color(),
      code: m?.code,
    });
    this.saved.emit();
    this.close.emit();
  }

  deleteMember(): void {
    const m = this.member();
    if (!m?.id) return;
    if (!confirm('Retirer ce membre ? Ses actions seront conservées mais non attribuées.')) return;
    this.codir.deleteMember(m.id);
    this.saved.emit();
    this.close.emit();
  }
}
