import { Component, inject } from '@angular/core';
import { OssatureToastService } from '../services/ossature-toast.service';

@Component({
  selector: 'app-ossature-toast',
  standalone: true,
  template: `
    @if (toast.visible()) {
      <div id="notif" style="display: block">{{ toast.message() }}</div>
    }
  `,
})
export class OssatureToastComponent {
  readonly toast = inject(OssatureToastService);
}
