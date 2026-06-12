import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { Audit } from '../audit-technique.models';
import { AuditScorePillComponent } from '../components/audit-score-pill.component';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { activeAudits, auditAvg, avgAudits, fmtDate, scoreColor, scoreLabel } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-agence',
  standalone: true,
  imports: [RouterLink, AuditScoreRingComponent, AuditScorePillComponent],
  templateUrl: './audit-agence.component.html',
})
export class AuditAgenceComponent {
  private readonly route = inject(ActivatedRoute);
  readonly data = inject(AuditTechniqueDataService);
  readonly corpsCount = computed(() => this.data.corpsCatalog().length);

  readonly agenceId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('agenceId')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('agenceId')) },
  );
  readonly agence = computed(() => this.data.getAgence(this.agenceId()));
  readonly activeAuditList = computed(() => activeAudits(this.agence()?.audits));
  readonly archivedAuditList = computed(() =>
    [...(this.agence()?.audits ?? [])]
      .filter((a) => a.archived)
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  readonly archivesOpen = signal(false);
  readonly score = computed(() => avgAudits(this.activeAuditList()));
  readonly sortedAudits = computed(() =>
    [...this.activeAuditList()].sort((a, b) => b.date.localeCompare(a.date)),
  );
  readonly urgentCount = computed(
    () => this.activeAuditList().flatMap((au) => au.corps).filter((c) => c.ecart === 'urgent').length,
  );

  readonly fmtDate = fmtDate;
  readonly scoreColor = scoreColor;
  readonly scoreLabel = scoreLabel;
  auditScore = auditAvg;

  notedCount(au: Audit): number {
    return au.corps.filter((c) => c.note !== null).length;
  }

  urgentInAudit(au: Audit): number {
    return au.corps.filter((c) => c.ecart === 'urgent').length;
  }

  minorInAudit(au: Audit): number {
    return au.corps.filter((c) => c.ecart === 'mineur').length;
  }

  isAuditOk(au: Audit): boolean {
    return !au.corps.some((c) => c.ecart === 'urgent' || c.ecart === 'mineur');
  }

  toggleArchives(): void {
    this.archivesOpen.update((v) => !v);
  }
}
