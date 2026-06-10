import { Component, computed, input } from '@angular/core';
import { noteBg, noteLabel, noteVar } from '../utils/audit-commerce.utils';

@Component({
  selector: 'app-audit-com-status-pill',
  standalone: true,
  template: `
    @if (note() == null) {
      <span class="pill" style="background: var(--line2); color: var(--ink-soft)">— pas de note</span>
    } @else {
      <span
        class="pill"
        [style.background]="bg()"
        [style.color]="color()"
      >
        <span class="pill-dot" [style.background]="color()"></span>
        {{ label() }} · {{ note()!.toFixed(1) }}/10
      </span>
    }
  `,
})
export class AuditComStatusPillComponent {
  readonly note = input<number | null>(null);
  readonly threshold = input(5);

  readonly color = computed(() => noteVar(this.note(), this.threshold()));
  readonly bg = computed(() => noteBg(this.note(), this.threshold()));
  readonly label = computed(() => noteLabel(this.note(), this.threshold()));
}
