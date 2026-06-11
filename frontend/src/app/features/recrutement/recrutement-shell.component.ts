import { Component, computed, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AppReturnBannerComponent } from '../../shared/components/app-return-banner/app-return-banner.component';
import { NATUREA_LOGO } from '../../shared/constants/branding';
import { RecrutCandidatePickerComponent } from './components/recrut-candidate-picker.component';
import { RecrutFileViewerComponent } from './components/recrut-file-viewer.component';
import { RecrutToastComponent } from './components/recrut-toast.component';
import { RecrutementModeService } from './services/recrutement-mode.service';

@Component({
  selector: 'app-recrutement-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    AppReturnBannerComponent,
    RecrutToastComponent,
    RecrutFileViewerComponent,
    RecrutCandidatePickerComponent,
  ],
  templateUrl: './recrutement-shell.component.html',
  styleUrl: './recrutement-shell.component.scss',
  host: { class: 'recrut-app' },
})
export class RecrutementShellComponent implements OnInit {
  readonly mode = inject(RecrutementModeService);
  private readonly auth = inject(AuthService);
  readonly logo = NATUREA_LOGO;

  readonly session = this.mode.session;
  readonly isAdmin = this.mode.isAdmin;

  readonly displayName = computed(() => this.session()?.name ?? '—');

  readonly adminNav = [
    { label: "Vue d'ensemble", route: '/apps/recrutement', icon: '📊' },
    { label: 'CRM Candidats', route: '/apps/recrutement/crm', icon: '👥' },
    { label: 'Nouveau candidat', route: '/apps/recrutement/nouveau', icon: '➕' },
  ];

  readonly candidateNav = [
    { label: 'Accueil', route: '/apps/recrutement/espace', icon: '🏠' },
    { label: 'Mon dossier', route: '/apps/recrutement/espace/dossier', icon: '📁' },
  ];

  ngOnInit(): void {
    const candidatId = this.auth.linkedRecrutementCandidatId();
    if (this.auth.isRecrutementCandidate() && candidatId) {
      this.mode.setCandidateMode(candidatId, false);
      return;
    }
    this.mode.setAdminMode();
  }
}
