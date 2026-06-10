import { Component, inject, input } from '@angular/core';
import { RecrutementDataService } from '../services/recrutement-data.service';

@Component({
  selector: 'app-recrut-badge',
  standalone: true,
  template: `<span class="badge" [class]="badgeClass()">{{ statut() }}</span>`,
})
export class RecrutBadgeComponent {
  private readonly data = inject(RecrutementDataService);
  readonly statut = input.required<string>();
  readonly badgeClass = () => this.data.statusBadgeClass(this.statut());
}
