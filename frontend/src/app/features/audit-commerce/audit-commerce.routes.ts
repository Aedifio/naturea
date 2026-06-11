import { Routes } from '@angular/router';
import {
  auditCommerceAgencyGuard,
  auditCommerceNetworkGuard,
} from '../../core/auth/audit-agency-scope.guard';
import { AuditCommerceShellComponent } from './audit-commerce-shell.component';
import { AuditComAgencyComponent } from './pages/audit-com-agency.component';
import { AuditComNetworkComponent } from './pages/audit-com-network.component';

export const AUDIT_COMMERCE_ROUTES: Routes = [
  {
    path: '',
    component: AuditCommerceShellComponent,
    children: [
      { path: '', component: AuditComNetworkComponent, canActivate: [auditCommerceNetworkGuard()] },
      { path: 'agence/:agencyId', component: AuditComAgencyComponent, canActivate: [auditCommerceAgencyGuard()] },
    ],
  },
];
