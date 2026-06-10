import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Agency, SynthView } from '../audit-commerce.models';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import { monthKpis, monthNoteStats, noteVar, ymLabel } from '../utils/audit-commerce.utils';
import { AuditComEvolutionChartComponent } from './audit-com-evolution-chart.component';
import { AuditComRatiosTableComponent } from './audit-com-ratios-table.component';

@Component({
  selector: 'app-audit-com-synthese-tab',
  standalone: true,
  imports: [FormsModule, AuditComEvolutionChartComponent, AuditComRatiosTableComponent],
  templateUrl: './audit-com-synthese-tab.component.html',
})
export class AuditComSyntheseTabComponent {
  readonly agency = input.required<Agency>();

  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);

  readonly ym = computed(() => this.ui.ym());
  readonly kpis = computed(() => monthKpis(this.agency(), this.ui.ym()));
  readonly mnote = computed(() => monthNoteStats(this.agency(), this.ui.ym()).agency);
  readonly threshold = computed(() => this.data.settings().noteThreshold);
  readonly nbMonth = computed(() => this.agency().audits.filter((au) => au.date?.slice(0, 7) === this.ui.ym()).length);

  readonly ymLabel = ymLabel;
  readonly noteVar = noteVar;
  readonly Math = Math;

  updateObjective(field: 'signatures' | 'ccmi' | 'transfo', value: string): void {
    const obj = { ...this.agency().objectives, [field]: value === '' ? undefined : Number(value) };
    this.data.updateAgency(this.agency().id, { objectives: obj });
  }

  readonly synthViews: Array<{ id: SynthView; label: string }> = [
    { id: 'mois', label: 'Par mois' },
    { id: 'annee', label: 'Par année' },
    { id: 'glissant', label: '12 mois glissants' },
  ];

  setSynthView(view: SynthView): void {
    this.ui.synthView.set(view);
  }
}
