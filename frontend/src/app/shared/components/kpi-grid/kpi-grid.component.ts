import { Component, input } from '@angular/core';
import { KpiItem } from '../../../core/models/kpi.model';

@Component({
  selector: 'app-kpi-grid',
  standalone: true,
  template: `
    <div class="kpi-grid">
      @for (item of items(); track item.label) {
        <div class="kpi">
          <div class="kpi-v" [class]="item.tone || ''">{{ item.value }}</div>
          <div class="kpi-l">{{ item.label }}</div>
        </div>
      }
    </div>
  `,
})
export class KpiGridComponent {
  items = input.required<KpiItem[]>();
}
