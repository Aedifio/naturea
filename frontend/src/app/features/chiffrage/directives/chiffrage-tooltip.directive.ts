import { Directive, HostListener, inject, input } from '@angular/core';
import { ChiffrageTooltipService } from '../services/chiffrage-tooltip.service';

@Directive({
  selector: '[chiffrageTooltip]',
  standalone: true,
})
export class ChiffrageTooltipDirective {
  private readonly tooltip = inject(ChiffrageTooltipService);

  readonly chiffrageTooltip = input.required<string>();

  @HostListener('mouseenter', ['$event.currentTarget'])
  onEnter(anchor: EventTarget | null): void {
    const text = this.chiffrageTooltip();
    if (text && anchor instanceof HTMLElement) {
      this.tooltip.show(text, anchor);
    }
  }

  @HostListener('mouseleave')
  onLeave(): void {
    this.tooltip.hide();
  }
}
