import { Component, computed, inject, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CHARPENTE_EXT } from '../constants/chiffrage-charpente.constants';
import type { CharpenteExtValues } from '../chiffrage.models';
import { fmtEurR, fmtNum } from '../utils/chiffrage.utils';
import { ChiffrageEstimatorService } from '../services/chiffrage-estimator.service';
import { ChiffrageUiService } from '../services/chiffrage-ui.service';

@Component({
  selector: 'app-chiffrage-charpente-ext',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './chiffrage-charpente-ext.component.html',
})
export class ChiffrageCharpenteExtComponent {
  readonly ui = inject(ChiffrageUiService);
  readonly estimator = inject(ChiffrageEstimatorService);

  readonly title = input('Estimateur charpente');
  readonly banner = input(false);

  readonly fermettes = CHARPENTE_EXT.fermettes;
  readonly accessoires = CHARPENTE_EXT.accessoires;

  readonly vals = computed(() => this.ui.charpenteExt());
  readonly estimSubtotal = computed(() => this.estimator.calcCharpenteExtEstim(this.vals()));
  readonly estimDisabled = computed(() => this.vals().devis_ext > 0);

  fmtEurR = fmtEurR;
  fmtNum = fmtNum;

  onFieldChange(field: keyof CharpenteExtValues, raw: string): void {
    this.ui.setCharpenteExtField(field, raw);
  }
}
