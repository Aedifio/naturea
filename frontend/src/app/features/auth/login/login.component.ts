import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '../../../../environments/environment';
import { NATUREA_LOGO } from '../../../shared/constants/branding';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);

  readonly error = signal<string | null>(null);
  readonly logo = NATUREA_LOGO;
  readonly loading = signal(false);

  email = '';
  password = '';

  /** After Supabase auth succeeds, allow one native POST so password managers can record the login. */
  private allowNativePost = false;

  async onSubmit(event: SubmitEvent): Promise<void> {
    if (this.allowNativePost) {
      this.allowNativePost = false;
      return;
    }

    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement | null;
    if (!form) return;

    this.error.set(null);

    const email = this.email.trim();
    const password = this.password;
    if (!email || !password) {
      this.error.set('Email et mot de passe requis.');
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.auth.login(email, password);
      if (!result.ok) {
        this.error.set(result.error ?? 'Email ou mot de passe incorrect.');
        return;
      }

      this.finishLogin(form);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Production: native POST → server 303 /home (password managers).
   * Dev (ng serve): SPA redirect — dev server has no POST /login handler.
   */
  private finishLogin(form: HTMLFormElement): void {
    if (environment.production) {
      this.allowNativePost = true;
      form.requestSubmit();
      return;
    }
    window.location.assign('/home');
  }
}
