import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-hero',
  standalone: true,
  template: `
    <div class="ph">
      <div class="ph-in">
        <div>
          @if (kicker()) {
            <div class="ph-k">{{ kicker() }}</div>
          }
          <div class="ph-t" [innerHTML]="titleHtml()"></div>
          @if (subtitleHtml()) {
            <div class="ph-s" [innerHTML]="subtitleHtml()"></div>
          } @else if (subtitle()) {
            <div class="ph-s">{{ subtitle() }}</div>
          }
        </div>
        @if (stats().length) {
          <div class="ph-stats">
            @for (s of stats(); track s.label) {
              <div class="ph-stat">
                <div class="ph-n" [style.color]="s.color || null">{{ s.value }}</div>
                <div class="ph-l">{{ s.label }}</div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PageHeroComponent {
  kicker = input<string>('');
  titleHtml = input.required<string>();
  subtitle = input<string>('');
  subtitleHtml = input<string>('');
  stats = input<Array<{ value: string | number; label: string; color?: string }>>([]);
}
