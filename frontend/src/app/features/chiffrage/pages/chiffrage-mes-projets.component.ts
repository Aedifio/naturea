import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fmtDateFR, fmtEurR, fmtTimeFR } from '../utils/chiffrage.utils';
import { ChiffrageDataService } from '../services/chiffrage-data.service';
import { ChiffrageUiService } from '../services/chiffrage-ui.service';

@Component({
  selector: 'app-chiffrage-mes-projets',
  standalone: true,
  imports: [],
  templateUrl: './chiffrage-mes-projets.component.html',
})
export class ChiffrageMesProjetsComponent {
  private readonly router = inject(Router);
  readonly data = inject(ChiffrageDataService);
  readonly ui = inject(ChiffrageUiService);

  readonly projetsList = computed(() => this.data.projets());
  readonly countLabel = computed(() => {
    const n = this.projetsList().length;
    return `${n} projet${n > 1 ? 's' : ''}`;
  });

  fmtEurR = fmtEurR;
  fmtDateFR = fmtDateFR;
  fmtTimeFR = fmtTimeFR;

  constructor() {
    this.data.hydrateFromStorage();
  }

  reopen(id: number): void {
    this.ui.reopenProjet(id);
    void this.router.navigate(['/apps/chiffrage']);
  }

  delete(id: number): void {
    if (!confirm('Supprimer définitivement ce projet ?')) return;
    this.ui.deleteProjet(id);
  }
}
