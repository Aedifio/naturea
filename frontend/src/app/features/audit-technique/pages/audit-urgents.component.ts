import { Component, computed, inject } from '@angular/core';
import { AuditUrgentsTableComponent } from '../components/audit-urgents-table.component';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';

@Component({
  selector: 'app-audit-urgents',
  standalone: true,
  imports: [AuditUrgentsTableComponent],
  template: `
    <div class="topbar">
      <h2>Écarts urgents & suivi rectificatif</h2>
      <div style="display: flex; gap: 8px">
        <span class="badge badge-red">{{ open().length }} ouvert{{ open().length > 1 ? 's' : '' }}</span>
        <span class="badge badge-green">{{ closed().length }} corrigé{{ closed().length > 1 ? 's' : '' }}</span>
      </div>
    </div>
    <div class="content fade-up">
      @if (open().length) {
        <div class="card" style="margin-bottom: 20px">
          <div class="section-title">En attente / en cours</div>
          <app-audit-urgents-table [items]="open()" />
        </div>
      }
      @if (closed().length) {
        <div class="card">
          <div class="section-title" style="color: var(--green)">Corrigés</div>
          <app-audit-urgents-table [items]="closed()" [greyed]="true" />
        </div>
      }
      @if (!urgents().length) {
        <div class="card"><div class="empty">Aucun écart urgent enregistré dans le réseau.</div></div>
      }
    </div>
  `,
})
export class AuditUrgentsComponent {
  readonly data = inject(AuditTechniqueDataService);
  readonly urgents = computed(() => this.data.getAllUrgents());
  readonly open = computed(() => this.urgents().filter((u) => u.rectifStatus !== 'corrige'));
  readonly closed = computed(() => this.urgents().filter((u) => u.rectifStatus === 'corrige'));
}
