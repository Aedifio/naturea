import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NATUREA_LOGO } from '../../../shared/constants/branding';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly error = signal<string | null>(null);
  readonly logo = NATUREA_LOGO;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async submit(): Promise<void> {
    this.error.set(null);
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();

    const result = await this.auth.login(email, password);
    if (result.ok) {
      await this.offerCredentialSave(email, password);
      await this.router.navigate(['/home']);
    } else {
      this.error.set(result.error ?? 'Email ou mot de passe incorrect.');
    }
  }

  /** Prompt browser / password manager to save credentials (SPA login). */
  private async offerCredentialSave(email: string, password: string): Promise<void> {
    const PasswordCredentialCtor = (
      globalThis as { PasswordCredential?: new (init: { id: string; password: string; name?: string }) => Credential }
    ).PasswordCredential;
    if (!PasswordCredentialCtor) return;
    try {
      const cred = new PasswordCredentialCtor({ id: email, password, name: email });
      await navigator.credentials.store(cred);
    } catch {
      // User dismissed or browser blocked — ignore
    }
  }
}
