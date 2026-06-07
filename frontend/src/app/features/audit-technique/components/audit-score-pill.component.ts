import { Component, computed, input } from '@angular/core';
import { scoreColor } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-score-pill',
  standalone: true,
  template: `
    <span class="score-pill" [style.background]="bg()" [style.color]="color()" [style.border-color]="border()">
      {{ score() !== null && score() !== undefined ? score()!.toFixed(1) + '/5' : '—' }}
    </span>
  `,
  styles: `
    .score-pill {
      display: inline-flex;
      align-items: center;
      font-family: var(--sans);
      font-size: 12px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 6px;
      font-variant-numeric: tabular-nums;
      border: 1px solid transparent;
    }
  `,
})
export class AuditScorePillComponent {
  readonly score = input<number | null>(null);

  readonly color = computed(() => scoreColor(this.score()));
  readonly bg = computed(() => `${this.color()}18`);
  readonly border = computed(() => `${this.color()}30`);
}
