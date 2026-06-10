import { Component, input } from '@angular/core';

@Component({
  selector: 'app-recrut-topbar',
  standalone: true,
  template: `
    <div class="topbar">
      <div>
        <div class="topbar-title">{{ title() }}</div>
        @if (subtitle()) {
          <div class="topbar-sub">{{ subtitle() }}</div>
        }
      </div>
      <div class="topbar-actions">
        <ng-content />
      </div>
    </div>
  `,
  styles: `.topbar-actions { display: flex; gap: 10px; align-items: center; }`,
})
export class RecrutTopbarComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
