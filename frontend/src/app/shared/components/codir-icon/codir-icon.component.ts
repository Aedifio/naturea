import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CODIR_ICON_PATHS, CodirIconName } from './codir-icons';

@Component({
  selector: 'app-codir-icon',
  standalone: true,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      [innerHTML]="paths()"
    ></svg>
  `,
  styles: `:host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; flex-shrink: 0; }`,
})
export class CodirIconComponent {
  private readonly sanitizer = inject(DomSanitizer);

  readonly name = input.required<CodirIconName>();
  readonly size = input(16);

  readonly paths = computed((): SafeHtml => {
    const inner = CODIR_ICON_PATHS[this.name()] ?? '';
    return this.sanitizer.bypassSecurityTrustHtml(inner);
  });
}
