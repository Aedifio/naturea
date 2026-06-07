import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RecrutementToastService {
  readonly message = signal('');
  readonly visible = signal(false);
  private hideTimer: ReturnType<typeof setTimeout> | undefined;

  show(message: string, durationMs = 3200): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.message.set(message);
    this.visible.set(true);
    this.hideTimer = setTimeout(() => this.visible.set(false), durationMs);
  }
}
