import { Component, inject } from '@angular/core';
import { RecrutementDataService } from '../services/recrutement-data.service';
import { RecrutementModeService } from '../services/recrutement-mode.service';

@Component({
  selector: 'app-recrut-candidate-picker',
  standalone: true,
  template: `
    @if (mode.pickerOpen()) {
      <div class="mini-wrap">
        <div class="ov" (click)="mode.closePicker()"></div>
        <div class="mini-pick">
          <h4 style="font-family:'Archivo Black','Archivo',sans-serif;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:var(--ink);margin-bottom:14px">
            Voir l'espace de quel candidat ?
          </h4>
          @for (c of data.activeCandidates(); track c.id) {
            <button type="button" class="mini-row" (click)="mode.pickCandidate(c.id)">
              <span class="av" style="width:36px;height:36px;font-size:13px">{{ data.initials(c.prenom, c.nom) }}</span>
              <span>
                <div style="font-weight:600;color:var(--ink)">{{ c.prenom }} {{ c.nom }}</div>
                <div style="font-size:11px;color:var(--muted)">{{ c.email }}</div>
              </span>
            </button>
          }
          <button type="button" class="btn btn-outline btn-sm" style="margin-top:12px;width:100%" (click)="mode.closePicker()">
            Annuler
          </button>
        </div>
      </div>
    }
  `,
})
export class RecrutCandidatePickerComponent {
  readonly mode = inject(RecrutementModeService);
  readonly data = inject(RecrutementDataService);
}
