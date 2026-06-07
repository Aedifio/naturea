import { Component, inject } from '@angular/core';
import { CHARPENTE_EXT } from '../constants/chiffrage-charpente.constants';
import { REFS } from '../constants/chiffrage-refs.constants';
import type { UsineKey } from '../chiffrage.models';
import { fmtDateFR, fmtEurR, fmtNum } from '../utils/chiffrage.utils';
import { ChiffrageDataService } from '../services/chiffrage-data.service';

@Component({
  selector: 'app-chiffrage-referentiel',
  standalone: true,
  templateUrl: './chiffrage-referentiel.component.html',
})
export class ChiffrageReferentielComponent {
  readonly data = inject(ChiffrageDataService);

  readonly usines = this.data.getAllUsineKeys().map((key) => ({ key, ref: this.data.getUsineRef(key) }));
  readonly charpenteExt = CHARPENTE_EXT;

  fmtNum = fmtNum;
  fmtEurR = fmtEurR;
  fmtDateFR = fmtDateFR;

  posteCodes(key: UsineKey): string[] {
    return this.data.getAllPosteCodes(key);
  }

  getPoste(key: UsineKey, code: string) {
    return this.data.getPoste(key, code);
  }

  hasOverride(key: UsineKey, code: string): boolean {
    return this.data.hasOverride(key, code);
  }

  hasPrixOverride(key: UsineKey, code: string): boolean {
    return this.data.hasPrixOverride(key, code);
  }

  getPrix(key: UsineKey, code: string): number {
    return this.data.getPrixCalcule(key, code);
  }

  isCustom(key: UsineKey, code: string): boolean {
    return this.data.isCustomPoste(key, code);
  }

  fiabiliteUsine(devisCount: number): string {
    return devisCount >= 10 ? 'haute' : devisCount >= 5 ? 'moyenne' : 'faible';
  }
}
