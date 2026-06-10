import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ECARTS } from '../constants/audit-technique.constants';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { auditAvg, corpsRelevant, fmtDate, scoreColor } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-detail',
  standalone: true,
  imports: [RouterLink, AuditScoreRingComponent],
  templateUrl: './audit-detail.component.html',
})
export class AuditDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly data = inject(AuditTechniqueDataService);
  private readonly router = inject(Router);

  readonly agenceId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('agenceId')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('agenceId')) },
  );
  readonly auditId = toSignal(
    this.route.paramMap.pipe(map((p) => Number(p.get('auditId')))),
    { initialValue: Number(this.route.snapshot.paramMap.get('auditId')) },
  );

  readonly agence = computed(() => this.data.getAgence(this.agenceId()));
  readonly audit = computed(() => this.data.getAudit(this.agenceId(), this.auditId()));
  readonly score = computed(() => (this.audit() ? auditAvg(this.audit()!) : null));
  readonly relevant = computed(() => (this.audit()?.corps ?? []).filter(corpsRelevant));
  readonly urgents = computed(() => (this.audit()?.corps ?? []).filter((c) => c.ecart === 'urgent'));

  readonly ecarts = ECARTS;
  readonly fmtDate = fmtDate;
  readonly scoreColor = scoreColor;

  ecartMeta(value: string | null) {
    return ECARTS.find((e) => e.value === value);
  }

  deleteAudit(): void {
    if (!confirm('Supprimer cet audit ?')) return;
    this.data.deleteAudit(this.agenceId(), this.auditId());
    void this.router.navigate(['/apps/audit-technique/agence', this.agenceId()]);
  }
}
