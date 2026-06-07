import { Component, inject, input, output } from '@angular/core';
import { REFS } from '../constants/chiffrage-refs.constants';
import type { UsineKey } from '../chiffrage.models';
import { ChiffrageDataService } from '../services/chiffrage-data.service';

@Component({
  selector: 'app-chiffrage-usine-picker',
  standalone: true,
  templateUrl: './chiffrage-usine-picker.component.html',
})
export class ChiffrageUsinePickerComponent {
  readonly data = inject(ChiffrageDataService);

  readonly selected = input.required<UsineKey>();
  readonly usineChange = output<UsineKey>();

  readonly usines = this.data.getAllUsineKeys().map((key) => ({
    key,
    nom: REFS[key].nom,
    description: REFS[key].description,
    devis_count: REFS[key].devis_count,
  }));

  select(key: UsineKey): void {
    this.usineChange.emit(key);
  }
}
