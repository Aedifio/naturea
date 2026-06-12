import { Routes } from '@angular/router';
import {
  auditTechniqueAgencyGuard,
  auditTechniqueNetworkGuard,
} from '../../core/auth/audit-agency-scope.guard';
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
      { path: '', component: AuditDashboardComponent, canActivate: [auditTechniqueNetworkGuard()] },
      { path: 'urgents', component: AuditUrgentsComponent, canActivate: [auditTechniqueNetworkGuard()] },
      { path: 'classement', component: AuditClassementComponent, canActivate: [auditTechniqueNetworkGuard()] },
      { path: 'agence/:agenceId', component: AuditAgenceComponent, canActivate: [auditTechniqueAgencyGuard()] },
      { path: 'agence/:agenceId/nouveau', component: AuditNewComponent, canActivate: [auditTechniqueAgencyGuard()] },
      {
        path: 'agence/:agenceId/audit/:auditId/edition',
        component: AuditNewComponent,
        canActivate: [auditTechniqueAgencyGuard()],
      },
      {
        path: 'agence/:agenceId/audit/:auditId',
        component: AuditDetailComponent,
        canActivate: [auditTechniqueAgencyGuard()],
      },
    ],
  },
];
