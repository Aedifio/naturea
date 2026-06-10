import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import { monthKpis, monthNoteStats, noteVar, ymLabel } from '../utils/audit-commerce.utils';
import { AuditComNetworkChartComponent } from '../components/audit-com-network-chart.component';
import { AuditComStatusPillComponent } from '../components/audit-com-status-pill.component';

@Component({
  selector: 'app-audit-com-network',
  standalone: true,
  imports: [AuditComNetworkChartComponent, AuditComStatusPillComponent],
  templateUrl: './audit-com-network.component.html',
})
export class AuditComNetworkComponent {
  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);
  private readonly router = inject(Router);

  readonly ym = computed(() => this.ui.ym());
  readonly threshold = computed(() => this.data.settings().noteThreshold);

  readonly rows = computed(() => {
    const ym = this.ui.ym();
    return this.data
      .agencies()
      .map((a) => ({ a, k: monthKpis(a, ym), note: monthNoteStats(a, ym).agency }))
      .sort((x, y) => {
        if (x.note == null) return 1;
        if (y.note == null) return -1;
        return x.note - y.note;
      });
  });

  readonly totals = computed(() => {
    const r = this.rows();
    return r.reduce(
      (acc, row) => ({ s: acc.s + row.k.signatures, c: acc.c + row.k.ccmi }),
      { s: 0, c: 0 },
    );
  });

  readonly totObj = computed(() =>
    this.data.agencies().reduce((s, a) => s + (Number(a.objectives?.signatures) || 0), 0),
  );

  readonly transfo = computed(() => {
    const r = this.rows();
    return r.length ? r.reduce((a, row) => a + row.k.transfo, 0) / r.length : 0;
  });

  readonly trouble = computed(() => {
    const th = this.threshold();
    return this.rows().filter((r) => r.note != null && r.note < th).length;
  });

  readonly Math = Math;
  readonly ymLabel = ymLabel;
  readonly noteVar = noteVar;

  goAgency(id: number): void {
    this.router.navigate(['/apps/audit-commerce/agence', id]);
  }
}
