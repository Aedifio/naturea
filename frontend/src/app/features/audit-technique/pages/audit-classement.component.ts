import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuditScorePillComponent } from '../components/audit-score-pill.component';
import { AuditScoreRingComponent } from '../components/audit-score-ring.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { scoreColor } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-classement',
  standalone: true,
  imports: [RouterLink, AuditScoreRingComponent, AuditScorePillComponent],
  templateUrl: './audit-classement.component.html',
})
export class AuditClassementComponent {
  readonly data = inject(AuditTechniqueDataService);

  readonly sorted = computed(() => this.data.agencesSortedByScore());
  readonly cmScores = computed(() => this.data.getCorpsWeaknesses());

  readonly scoreColor = scoreColor;

  rankColor(i: number): string {
    if (i === 0) return '#c9a23a';
    if (i === 1) return '#9ca39e';
    if (i === 2) return '#a87341';
    return 'var(--text3)';
  }
}
