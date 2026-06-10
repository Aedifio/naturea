import { Routes } from '@angular/router';
import { RecrutCrmComponent } from './pages/recrut-crm.component';
import { RecrutCandidateDetailComponent } from './pages/recrut-candidate-detail.component';
import { RecrutDashboardComponent } from './pages/recrut-dashboard.component';
import { RecrutNewCandidateComponent } from './pages/recrut-new-candidate.component';
import { RecrutPortalDocsComponent } from './pages/recrut-portal-docs.component';
import { RecrutPortalHomeComponent } from './pages/recrut-portal-home.component';
import { RecrutementShellComponent } from './recrutement-shell.component';

export const RECRUTEMENT_ROUTES: Routes = [
  {
    path: '',
    component: RecrutementShellComponent,
    children: [
      { path: '', component: RecrutDashboardComponent },
      { path: 'crm', component: RecrutCrmComponent },
      { path: 'nouveau', component: RecrutNewCandidateComponent },
      { path: 'candidat/:id', component: RecrutCandidateDetailComponent },
      { path: 'espace', component: RecrutPortalHomeComponent },
      { path: 'espace/dossier', component: RecrutPortalDocsComponent },
    ],
  },
];
