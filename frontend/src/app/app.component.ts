import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    @if (auth.authReady()) {
      <router-outlet />
    } @else {
      <div class="boot-loading">Chargement…</div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
      }
      .boot-loading {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: var(--sans, system-ui, sans-serif);
        color: var(--muted, #4f5f56);
        background: var(--bg, #f7f4ec);
      }
    `,
  ],
})
export class AppComponent {
  readonly auth = inject(AuthService);
}
