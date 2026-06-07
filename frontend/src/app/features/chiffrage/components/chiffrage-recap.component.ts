import { Component, computed, inject, output } from '@angular/core';
import { fmtEurR } from '../utils/chiffrage.utils';
import { ChiffrageEstimatorService } from '../services/chiffrage-estimator.service';
import { ChiffrageUiService } from '../services/chiffrage-ui.service';

@Component({
  selector: 'app-chiffrage-recap',
  standalone: true,
  templateUrl: './chiffrage-recap.component.html',
  styleUrl: './chiffrage-recap.component.scss',
})
export class ChiffrageRecapComponent {
  readonly ui = inject(ChiffrageUiService);
  readonly estimator = inject(ChiffrageEstimatorService);

  readonly save = output<void>();
  readonly exportPdf = output<void>();
  readonly reset = output<void>();

  readonly recap = computed(() => this.ui.recap());
  readonly usine = computed(() => this.ui.currentUsine());
  readonly showCharpenteSection = computed(
    () =>
      this.estimator.isCharpenteHiddenForUsine(this.usine()) ||
      this.estimator.isCharpenteEnsembleUsine(this.usine()),
  );
  readonly charpenteLabel = computed(() =>
    this.estimator.isCharpenteEnsembleUsine(this.usine()) ? '🏗️ Charpente SICOB' : '🏗️ Charpente externe',
  );

  fmtEurR = fmtEurR;
}
