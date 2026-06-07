import { Component, inject, input } from '@angular/core';
import { Candidate } from '../recrutement.models';
import { RecrutementDataService } from '../services/recrutement-data.service';

@Component({
  selector: 'app-recrut-pct-bar',
  standalone: true,
  template: `
    <div style="display:flex;align-items:center;gap:8px">
      <div style="flex:1;background:var(--sand2);border-radius:10px;height:6px">
        <div
          [style.width.%]="percent()"
          style="height:6px;border-radius:10px"
          [style.background]="color()"
        ></div>
      </div>
      <span style="font-size:12px;color:var(--muted)">{{ percent() }}%</span>
    </div>
  `,
})
export class RecrutPctBarComponent {
  private readonly data = inject(RecrutementDataService);
  readonly candidate = input.required<Candidate>();
  readonly percent = () => this.data.progressPercent(this.candidate());
  readonly color = () => this.data.progressColor(this.candidate());
}
