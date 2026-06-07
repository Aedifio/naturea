import { Component, computed, input } from '@angular/core';
import { STATUT_STYLE } from '../constants/ossature.constants';
import { statutLabel } from '../services/ossature-data.service';

@Component({
  selector: 'app-ossature-badge',
  standalone: true,
  template: `
    <span class="badge" [style.background]="style().bg" [style.color]="style().color">
      <span class="badge-dot" [style.background]="style().dot"></span>
      {{ label() }}
    </span>
  `,
})
export class OssatureBadgeComponent {
  readonly statut = input.required<string>();

  readonly label = computed(() => statutLabel(this.statut()));
  readonly style = computed(() => STATUT_STYLE[this.statut()] ?? { bg: '#eee', color: '#333', dot: '#999' });
}
