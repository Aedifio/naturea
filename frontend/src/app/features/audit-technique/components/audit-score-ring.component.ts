import { Component, computed, input } from '@angular/core';
import { scoreColor } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-score-ring',
  standalone: true,
  template: `
    <svg [attr.width]="size()" [attr.height]="size()">
      <circle
        [attr.cx]="cx()"
        [attr.cy]="cx()"
        [attr.r]="r()"
        fill="none"
        stroke="#e6dfce"
        [attr.stroke-width]="stroke()"
      />
      @if (score() !== null && score() !== undefined) {
        <circle
          [attr.cx]="cx()"
          [attr.cy]="cx()"
          [attr.r]="r()"
          fill="none"
          [attr.stroke]="color()"
          [attr.stroke-width]="stroke()"
          [attr.stroke-dasharray]="dash()"
          [attr.stroke-dashoffset]="0"
          stroke-linecap="round"
          style="transform: rotate(-90deg); transform-origin: center"
        />
      }
      <text
        [attr.x]="cx()"
        [attr.y]="cx() + 1"
        text-anchor="middle"
        dominant-baseline="middle"
        [attr.fill]="score() !== null && score() !== undefined ? color() : '#8a948c'"
        [attr.font-size]="fontSize()"
        font-weight="900"
        font-family="'Archivo Black', 'Archivo', sans-serif"
        font-variant-numeric="tabular-nums"
      >
        {{ score() !== null && score() !== undefined ? score()!.toFixed(1) : '—' }}
      </text>
    </svg>
  `,
})
export class AuditScoreRingComponent {
  readonly score = input<number | null>(null);
  readonly size = input(48);

  readonly cx = computed(() => this.size() / 2);
  readonly r = computed(() => this.size() * 0.36);
  readonly stroke = computed(() => Math.round(this.size() * 0.1));
  readonly fontSize = computed(() => Math.round(this.size() * 0.28));
  readonly color = computed(() => scoreColor(this.score()));
  readonly dash = computed(() => {
    const circ = 2 * Math.PI * this.r();
    const pct = this.score() !== null && this.score() !== undefined ? this.score()! / 5 : 0;
    return `${(pct * circ).toFixed(1)} ${circ.toFixed(1)}`;
  });
}
