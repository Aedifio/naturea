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

  submit(): void {
    this.error.set(null);
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    const result = this.auth.login(email, password);
    if (result.ok) {
      void this.router.navigate(['/home']);
    } else {
      this.error.set(result.error ?? 'Email ou mot de passe incorrect.');
    }
  }
}
