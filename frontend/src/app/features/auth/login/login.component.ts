import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { NATUREA_LOGO } from '../../../shared/constants/branding';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly error = signal<string | null>(null);
  readonly logo = NATUREA_LOGO;
  readonly loading = signal(false);

  email = '';
  password = '';

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('reason') === 'blocked') {
      this.error.set('Votre compte a été désactivé. Contactez un administrateur.');
    }
  }

  async onSubmit(event: SubmitEvent): Promise<void> {
    event.preventDefault();

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

      window.location.assign(this.auth.defaultRouteAfterLogin());
    } finally {
      this.loading.set(false);
    }
  }
}
