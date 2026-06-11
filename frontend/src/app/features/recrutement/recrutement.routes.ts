import { Routes } from '@angular/router';
import { RecrutCrmComponent } from './pages/recrut-crm.component';
import { RecrutCandidateDetailComponent } from './pages/recrut-candidate-detail.component';
import { RecrutDashboardComponent } from './pages/recrut-dashboard.component';
import { RecrutNewCandidateComponent } from './pages/recrut-new-candidate.component';
import { RecrutPortalDocsComponent } from './pages/recrut-portal-docs.component';
import { RecrutPortalHomeComponent } from './pages/recrut-portal-home.component';
import { RecrutementShellComponent } from './recrutement-shell.component';
import { recrutementHomeGuard, recrutementStaffGuard } from './recrutement-staff.guard';

export const RECRUTEMENT_ROUTES: Routes = [
  {
    path: '',
    component: RecrutementShellComponent,
    children: [
      { path: '', component: RecrutDashboardComponent, canActivate: [recrutementHomeGuard] },
      { path: 'crm', component: RecrutCrmComponent, canActivate: [recrutementStaffGuard] },
      { path: 'nouveau', component: RecrutNewCandidateComponent, canActivate: [recrutementStaffGuard] },
      { path: 'candidat/:id', component: RecrutCandidateDetailComponent, canActivate: [recrutementStaffGuard] },
      { path: 'espace', component: RecrutPortalHomeComponent },
      { path: 'espace/dossier', component: RecrutPortalDocsComponent },
    ],
  },
];
