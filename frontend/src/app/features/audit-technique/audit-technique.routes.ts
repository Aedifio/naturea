import { Routes } from '@angular/router';
import { AuditTechniqueShellComponent } from './audit-technique-shell.component';
import { AuditAgenceComponent } from './pages/audit-agence.component';
import { AuditClassementComponent } from './pages/audit-classement.component';
import { AuditDashboardComponent } from './pages/audit-dashboard.component';
import { AuditDetailComponent } from './pages/audit-detail.component';
import { AuditNewComponent } from './pages/audit-new.component';
import { AuditUrgentsComponent } from './pages/audit-urgents.component';

export const AUDIT_TECHNIQUE_ROUTES: Routes = [
  {
    path: '',
    component: AuditTechniqueShellComponent,
    children: [
      { path: '', component: AuditDashboardComponent },
      { path: 'urgents', component: AuditUrgentsComponent },
      { path: 'classement', component: AuditClassementComponent },
      { path: 'agence/:agenceId', component: AuditAgenceComponent },
      { path: 'agence/:agenceId/audit/:auditId', component: AuditDetailComponent },
      { path: 'agence/:agenceId/nouveau', component: AuditNewComponent },
    ],
  },
];
