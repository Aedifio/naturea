import { computed, Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ChiffrageToastService {
  readonly message = signal<string | null>(null);
  readonly visible = computed(() => this.message() !== null);

  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  show(msg: string): void {
    this.message.set(msg);
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.message.set(null);
      this.timeoutId = null;
    }, 2500);
  }
}
