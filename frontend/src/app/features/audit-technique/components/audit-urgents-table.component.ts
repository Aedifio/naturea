import { Component, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { UrgentEcart } from '../audit-technique.models';
import { RECTIF_STATUS } from '../constants/audit-technique.constants';
import { AuditTechniqueDataService } from '../services/audit-technique-data.service';
import { fmtDate } from '../utils/audit-score.util';

@Component({
  selector: 'app-audit-urgents-table',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="table-scroll">
      <table class="table" [style.opacity]="greyed() ? 0.6 : null">
        <thead>
          <tr>
            <th>Corps de métier</th>
            <th>Agence</th>
            <th>Audit</th>
            <th>Commentaire</th>
            <th>Statut rectificatif</th>
            <th>Note de suivi</th>
          </tr>
        </thead>
        <tbody>
          @for (u of items(); track u.agenceId + '-' + u.auditId + '-' + u.corpsId) {
            <tr>
              <td>
                <div class="corps-cell">
                  <span class="mono code">{{ u.corpsCode }}</span>
                  <span class="label">{{ u.corpsLabel }}</span>
                </div>
              </td>
              <td>
                <div class="ag-nom">{{ u.agenceNom }}</div>
                <div class="ag-ville">{{ u.agenceVille }}</div>
              </td>
              <td><span class="mono date">{{ fmtDate(u.auditDate) }}</span></td>
              <td class="comment">{{ u.commentaire || '—' }}</td>
              <td>
                <select
                  class="rectif-select"
                  [ngModel]="u.rectifStatus"
                  (ngModelChange)="onStatus(u, $event)"
                  [style.background]="statusStyle(u.rectifStatus).bg"
                  [style.color]="statusStyle(u.rectifStatus).color"
                  [style.border-color]="statusStyle(u.rectifStatus).border"
                >
                  @for (r of rectifStatus; track r.value) {
                    <option [value]="r.value">{{ r.label }}</option>
                  }
                </select>
              </td>
              <td class="note-cell">
                <input
                  type="text"
                  class="rectif-note"
                  [ngModel]="u.rectifNote"
                  (ngModelChange)="onNote(u, $event)"
                  placeholder="Ajouter une note…"
                />
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    .table-scroll { overflow-x: auto; }
    .corps-cell { display: flex; align-items: center; gap: 8px; }
    .code { font-size: 10px; color: var(--text3, var(--subtle)); }
    .label { color: var(--text); font-weight: 500; }
    .ag-nom { font-size: 12px; font-weight: 500; color: var(--text); }
    .ag-ville { font-size: 11px; color: var(--text3, var(--subtle)); }
    .date { font-size: 12px; color: var(--text2, var(--muted)); }
    .comment { max-width: 200px; font-size: 12px; color: var(--text2, var(--muted)); white-space: pre-wrap; }
    .note-cell { min-width: 180px; }
    .rectif-select {
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 12px;
      width: auto;
      min-width: 130px;
      border: 1px solid;
    }
    .rectif-note { font-size: 12px; padding: 5px 10px; }
  `,
})
export class AuditUrgentsTableComponent {
  private readonly data = inject(AuditTechniqueDataService);

  readonly items = input.required<UrgentEcart[]>();
  readonly greyed = input(false);

  readonly rectifStatus = RECTIF_STATUS;
  readonly fmtDate = fmtDate;

  statusStyle(value: string) {
    const rs = RECTIF_STATUS.find((r) => r.value === value) ?? RECTIF_STATUS[0];
    return { bg: `${rs.color}18`, color: rs.color, border: `${rs.color}40` };
  }

  onStatus(u: UrgentEcart, val: string): void {
    this.data.updateRectif(u.agenceId, u.auditId, u.corpsId, 'rectifStatus', val);
  }

  onNote(u: UrgentEcart, val: string): void {
    this.data.updateRectif(u.agenceId, u.auditId, u.corpsId, 'rectifNote', val);
  }
}
