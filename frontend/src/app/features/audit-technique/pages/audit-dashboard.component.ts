import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuditScorePillComponent } from '../components/audit-score-pill.component';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { AuditUrgentsTableComponent } from '../components/audit-urgents-table.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { fmtDate, scoreColor, scoreLabel } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-dashboard',
  standalone: true,
  imports: [RouterLink, AuditScoreRingComponent, AuditScorePillComponent, AuditUrgentsTableComponent],
  templateUrl: './audit-dashboard.component.html',
})
export class AuditDashboardComponent {
  readonly data = inject(AuditTechniqueDataService);

  readonly gs = computed(() => this.data.networkScore());
  readonly audited = computed(() => this.data.auditedCount());
  readonly totalAgences = computed(() => this.data.agences().length);
  readonly allAudits = computed(() => this.data.allAudits());
  readonly urgents = computed(() => this.data.getAllUrgents());
  readonly open = computed(() => this.urgents().filter((u) => u.rectifStatus !== 'corrige'));
  readonly recentAg = computed(() => this.data.getRecentAgencies(3));
  readonly cmScores = computed(() => this.data.getCorpsWeaknesses().slice(0, 6));

  readonly lastAuditDate = computed(() => {
    const dates = this.allAudits().map((a) => a.date).sort().reverse();
    return dates[0] ?? null;
  });

  readonly todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  readonly scoreColor = scoreColor;
  readonly scoreLabel = scoreLabel;
  readonly fmtDate = fmtDate;
}
