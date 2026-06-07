import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import type { Audit } from '../audit-technique.models';
import { CORPS } from '../constants/audit-technique.constants';
import { AuditScorePillComponent } from '../components/audit-score-pill.component';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { auditAvg, avgAudits, fmtDate, scoreLabel } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-agence',
  standalone: true,
  imports: [RouterLink, AuditScoreRingComponent, AuditScorePillComponent],
  templateUrl: './audit-agence.component.html',
})
export class AuditAgenceComponent {
  private readonly route = inject(ActivatedRoute);
  readonly data = inject(AuditTechniqueDataService);
  readonly corpsCount = CORPS.length;

  readonly agenceId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('agenceId')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('agenceId')) },
  );
  readonly agence = computed(() => this.data.getAgence(this.agenceId()));
  readonly score = computed(() => avgAudits(this.agence()?.audits));
  readonly sortedAudits = computed(() =>
    [...(this.agence()?.audits ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
  );
  readonly urgentCount = computed(
    () => (this.agence()?.audits ?? []).flatMap((au) => au.corps).filter((c) => c.ecart === 'urgent').length,
  );

  readonly fmtDate = fmtDate;
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
}
