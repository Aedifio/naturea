import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
      // Full page navigation helps password managers detect a successful login (SPA router.navigate does not).
      window.setTimeout(() => window.location.assign('/home'), 150);
      return;
    }
    this.error.set(result.error ?? 'Email ou mot de passe incorrect.');
  }
}
