import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChiffrageTooltipService {
  private el: HTMLElement | null = null;

  show(text: string, anchor: HTMLElement): void {
    const tip = this.ensureEl();
    tip.textContent = text;
    tip.classList.add('on');
    const rect = anchor.getBoundingClientRect();
    tip.style.left = `${rect.left + window.scrollX}px`;
    tip.style.top = `${rect.bottom + window.scrollY + 6}px`;
  }

  hide(): void {
    this.el?.classList.remove('on');
  }

  private ensureEl(): HTMLElement {
    if (!this.el) {
      this.el = document.createElement('div');
      this.el.className = 'tip-pop';
      document.body.appendChild(this.el);
    }
    return this.el;
  }
}
