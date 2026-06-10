import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TOTAL_DOCS } from '../services/recrutement-data.service';
import { RecrutBadgeComponent } from '../components/recrut-badge.component';
import { RecrutTopbarComponent } from '../components/recrut-topbar.component';
import { RecrutementDataService } from '../services/recrutement-data.service';
import { RecrutementModeService } from '../services/recrutement-mode.service';

@Component({
  selector: 'app-recrut-portal-home',
  standalone: true,
  imports: [RouterLink, RecrutTopbarComponent, RecrutBadgeComponent],
  template: `
    <app-recrut-topbar title="Mon espace candidat" subtitle="Votre dossier de candidature franchise" />

    @if (candidate(); as c) {
      <div class="content">
        <div class="portal-hero">
          <div class="av" style="width:68px;height:68px;font-size:26px">{{ data.initials(c.prenom, c.nom) }}</div>
          <div class="ph-text">
            <h2>Bonjour, {{ c.prenom }} !</h2>
            <p>Complétez votre dossier pour avancer dans votre candidature.</p>
          </div>
        </div>

        <div class="progress-steps">
          @for (step of steps(); track step.label) {
            <div class="ps" [class.done]="step.done">
              <span class="ps-icon">{{ step.done ? '✅' : step.icon }}</span>
              <span class="ps-lbl">{{ step.label }}</span>
            </div>
          }
        </div>

        <div class="portal-grid">
          <a class="portal-card" routerLink="/apps/recrutement/espace/dossier">
            <div class="pc-icon">📁</div>
            <div class="pc-title">Mon dossier complet</div>
            <div class="pc-sub">{{ docSub() }}</div>
          </a>
          <div class="portal-card" style="background:var(--sand);cursor:default">
            <div class="pc-icon">📬</div>
            <div class="pc-title">Mon statut</div>
            <div style="margin-top:8px"><app-recrut-badge [statut]="c.statut" /></div>
          </div>
        </div>
      </div>
    }
  `,
})
export class RecrutPortalHomeComponent {
  readonly data = inject(RecrutementDataService);
  readonly mode = inject(RecrutementModeService);

  readonly candidate = computed(() => {
    const id = this.mode.currentCandidateId();
    return id ? this.data.getById(id) : undefined;
  });

  readonly docSub = computed(() => {
    const c = this.candidate();
    if (!c) return 'Documents, test DISC, questionnaire';
    const dc = this.data.docCount(c);
    if (dc <= 0) return 'Déposez vos pièces justificatives';
    const pct = this.data.progressPercent(c);
    return `${dc}/${TOTAL_DOCS} documents déposés (${pct}%)`;
  });

  readonly steps = computed(() => {
    const c = this.candidate();
    if (!c) return [];
    const dc = this.data.docCount(c);
    return [
      { icon: '📝', label: 'Inscrit', done: true },
      { icon: '📁', label: `Documents (${dc}/${TOTAL_DOCS})`, done: dc >= TOTAL_DOCS },
      { icon: '🧠', label: 'Test DISC', done: !!c.disc },
      { icon: '📋', label: 'Questionnaire', done: !!c.questionnaire },
      { icon: '✅', label: 'Dossier complet', done: dc >= TOTAL_DOCS && !!c.disc && !!c.questionnaire },
    ];
  });
}
