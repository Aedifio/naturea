import { Component, computed, inject } from '@angular/core';
import { RecrutDocListComponent } from '../components/recrut-doc-list.component';
import { RecrutTopbarComponent } from '../components/recrut-topbar.component';
import { RecrutementModeService } from '../services/recrutement-mode.service';

@Component({
  selector: 'app-recrut-portal-docs',
  standalone: true,
  imports: [RecrutTopbarComponent, RecrutDocListComponent],
  template: `
    <app-recrut-topbar title="Mon dossier" subtitle="Documents, test DISC et questionnaire" />

    <div class="content">
      <div class="tabs">
        <div class="tab active">📁 Documents</div>
      </div>
      <div class="tc active">
        @if (candidateId(); as id) {
          <app-recrut-doc-list [candidateId]="id" />
        }
      </div>
    </div>
  `,
})
export class RecrutPortalDocsComponent {
  private readonly mode = inject(RecrutementModeService);
  readonly candidateId = computed(() => this.mode.currentCandidateId());
}
