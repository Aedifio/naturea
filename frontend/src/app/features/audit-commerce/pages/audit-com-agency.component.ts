import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { AgencyTab } from '../audit-commerce.models';
import { AuditCommerceDataService } from '../services/audit-commerce-data.service';
import { AuditCommerceUiService } from '../services/audit-commerce-ui.service';
import { monthNoteStats, ymLabel } from '../utils/audit-commerce.utils';
import { AuditComAuditTabComponent } from '../components/audit-com-audit-tab.component';
import { AuditComDocsTabComponent } from '../components/audit-com-docs-tab.component';
import { AuditComEquipeTabComponent } from '../components/audit-com-equipe-tab.component';
import { AuditComSyntheseTabComponent } from '../components/audit-com-synthese-tab.component';
import { AuditComStatusPillComponent } from '../components/audit-com-status-pill.component';

@Component({
  selector: 'app-audit-com-agency',
  standalone: true,
  imports: [
    RouterLink,
    AuditComStatusPillComponent,
    AuditComSyntheseTabComponent,
    AuditComAuditTabComponent,
    AuditComEquipeTabComponent,
    AuditComDocsTabComponent,
  ],
  templateUrl: './audit-com-agency.component.html',
})
export class AuditComAgencyComponent {
  private readonly route = inject(ActivatedRoute);
  readonly data = inject(AuditCommerceDataService);
  readonly ui = inject(AuditCommerceUiService);

  readonly agencyId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('agencyId') ?? NaN))),
    { initialValue: Number(this.route.snapshot.paramMap.get('agencyId') ?? NaN) },
  );

  readonly agency = computed(() => {
    const id = this.agencyId();
    return Number.isFinite(id) ? this.data.getAgency(id) : undefined;
  });
  readonly note = computed(() => {
    const a = this.agency();
    return a ? monthNoteStats(a, this.ui.ym()).agency : null;
  });

  readonly ymLabel = ymLabel;

  readonly tabs: Array<{ id: AgencyTab; label: string }> = [
    { id: 'synthese', label: 'Synthèse & KPI' },
    { id: 'audit', label: 'Audit' },
    { id: 'equipe', label: 'Salariés' },
    { id: 'docs', label: 'Documents' },
  ];

  private lastAgencyId = 0;

  constructor() {
    effect(() => {
      const id = this.agencyId();
      if (Number.isFinite(id) && id !== this.lastAgencyId) {
        this.lastAgencyId = id;
        this.ui.resetAgencyUi();
        this.ui.auditId.set(this.data.resolveDefaultAuditId(id, this.ui.ym()));
      }
    });

    effect(() => {
      const a = this.agency();
      const ym = this.ui.ym();
      if (a) {
        const current = this.ui.auditId();
        if (current && !this.data.getAudit(a.id, current)) {
          this.ui.auditId.set(this.data.resolveDefaultAuditId(a.id, ym));
        }
      }
    });
  }

  setTab(tab: AgencyTab): void {
    this.ui.setTab(tab);
  }

  toggleArch(): void {
    this.ui.archOpen.update((v) => !v);
  }
}
