import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CodirDataService } from '../../core/services/codir-data.service';
import { CodirIconComponent } from '../../shared/components/codir-icon/codir-icon.component';

@Component({
  selector: 'app-codir-action-modal',
  standalone: true,
  imports: [FormsModule, CodirIconComponent],
  templateUrl: './codir-action-modal.component.html',
  styleUrl: './codir-action-modal.component.scss',
})
export class CodirActionModalComponent {
  private readonly codir = inject(CodirDataService);

  readonly open = input(false);
  readonly close = output<void>();
  readonly created = output<string>();

  readonly theme = signal('');
  readonly ownerId = signal('');
  readonly title = signal('');
  readonly description = signal('');
  readonly startDate = signal('');
  readonly deadline = signal('');
  readonly priority = signal<'low' | 'medium' | 'high'>('medium');

  readonly themes = this.codir.themes;
  readonly members = this.codir.members;

  constructor() {
    effect(() => {
      if (!this.open()) return;
      const themes = this.codir.themes();
      this.theme.set(themes[0] ?? '');
      this.ownerId.set('');
      this.title.set('');
      this.description.set('');
      this.startDate.set(this.todayIso());
      this.deadline.set('');
      this.priority.set('medium');
    });
  }

  private todayIso(): string {
    return new Date().toISOString().slice(0, 10);
  }

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
  }

  save(): void {
    const title = this.title().trim();
    if (!title) return;
    const id = this.codir.createAction({
      theme: this.theme(),
      title,
      description: this.description().trim(),
      ownerId: this.ownerId() || undefined,
      startDate: this.startDate(),
      deadline: this.deadline(),
      priority: this.priority(),
    });
    this.created.emit(id);
    this.close.emit();
  }
}
