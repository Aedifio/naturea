import { Component, inject } from '@angular/core';
import { ChiffrageToastService } from '../services/chiffrage-toast.service';

@Component({
  selector: 'app-chiffrage-toast',
  standalone: true,
  template: `
    <div class="toast" [class.on]="toast.visible()">{{ toast.message() }}</div>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class ChiffrageToastComponent {
  readonly toast = inject(ChiffrageToastService);
}
