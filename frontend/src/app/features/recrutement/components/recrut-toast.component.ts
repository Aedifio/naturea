import { Component, inject } from '@angular/core';
import { RecrutementToastService } from '../services/recrutement-toast.service';

@Component({
  selector: 'app-recrut-toast',
  standalone: true,
  template: `
    @if (toast.visible()) {
      <div class="toast visible">{{ toast.message() }}</div>
    }
  `,
})
export class RecrutToastComponent {
  readonly toast = inject(RecrutementToastService);
}
