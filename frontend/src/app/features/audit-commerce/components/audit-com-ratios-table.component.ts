import { Component, computed, input } from '@angular/core';
import type { Agency, Audit } from '../audit-commerce.models';
import { RATIO_COLS } from '../constants/audit-commerce.constants';
import { computeRatios, computeRatiosMonth } from '../utils/audit-commerce.utils';

@Component({
  selector: 'app-audit-com-ratios-table',
  standalone: true,
  template: `
    <div style="overflow-x: auto">
      <table class="ratbl">
        <thead>
          <tr>
            <th style="text-align: left">Salarié</th>
            @for (col of ratioCols; track col[0]) {
              <th>{{ col[1] }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track row.emp.id) {
            <tr>
              <td style="text-align: left; font-weight: 600">{{ row.emp.name || '(sans nom)' }}</td>
              @for (col of ratioCols; track col[0]) {
                <td>{{ fmt(row.r[col[0]]) }}</td>
              }
            </tr>
          }
          <tr class="agtot">
            <td style="text-align: left; font-weight: 800">Agence (total)</td>
            @for (col of ratioCols; track col[0]) {
              <td style="font-weight: 800; color: var(--clay)">{{ fmt(agencyRow()[col[0]]) }}</td>
            }
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class AuditComRatiosTableComponent {
  readonly agency = input.required<Agency>();
  readonly audit = input<Audit | null>(null);
  readonly ym = input<string | null>(null);

  readonly ratioCols = RATIO_COLS;

  readonly agencyRow = computed(() => {
    const a = this.agency();
    const au = this.audit();
    const ym = this.ym();
    if (au) return computeRatios(au, null);
    if (ym) return computeRatiosMonth(a, ym, null);
    return computeRatios(null, null);
  });

  readonly rows = computed(() => {
    const a = this.agency();
    const au = this.audit();
    const ym = this.ym();
    const getR = (id: string | null) => {
      if (au) return computeRatios(au, id);
      if (ym) return computeRatiosMonth(a, ym, id);
      return computeRatios(null, id);
    };
    return a.employees
      .map((e) => ({ emp: e, r: getR(e.id) }))
      .filter((x) => x.r.entrant || x.r.traite || x.r.rdv || x.r.sign || x.r.resil || x.r.hs || x.r.r1);
  });

  fmt(v: number | null | undefined): string {
    return v == null ? '—' : `${v.toFixed(1)}%`;
  }
}
