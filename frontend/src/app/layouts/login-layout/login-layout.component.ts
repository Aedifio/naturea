import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-login-layout',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet />`,
  styles: [`:host { display: block; min-height: 100vh; }`],
})
export class LoginLayoutComponent {}
