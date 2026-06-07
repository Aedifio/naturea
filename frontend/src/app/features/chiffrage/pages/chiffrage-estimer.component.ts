import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { UsineKey } from '../chiffrage.models';
import { ChiffrageFormComponent } from '../components/chiffrage-form.component';
import { ChiffrageRecapComponent } from '../components/chiffrage-recap.component';
import { ChiffrageUsinePickerComponent } from '../components/chiffrage-usine-picker.component';
import { ChiffrageToastService } from '../services/chiffrage-toast.service';
import { ChiffrageUiService } from '../services/chiffrage-ui.service';

@Component({
  selector: 'app-chiffrage-estimer',
  standalone: true,
  imports: [FormsModule, ChiffrageUsinePickerComponent, ChiffrageFormComponent, ChiffrageRecapComponent],
  templateUrl: './chiffrage-estimer.component.html',
})
export class ChiffrageEstimerComponent implements OnInit {
  readonly ui = inject(ChiffrageUiService);
  readonly toast = inject(ChiffrageToastService);

  ngOnInit(): void {
    this.ui.initEstimator();
  }

  onUsineChange(key: UsineKey): void {
    this.ui.setUsine(key);
  }

  onSave(): void {
    this.ui.saveProjet();
  }

  onExport(): void {
    this.toast.show('📄 Export PDF disponible en étape 3');
  }

  onReset(): void {
    this.ui.resetForm();
  }
}
