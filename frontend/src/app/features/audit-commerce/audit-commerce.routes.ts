import { Routes } from '@angular/router';
import { AuditCommerceShellComponent } from './audit-commerce-shell.component';
import { AuditComAgencyComponent } from './pages/audit-com-agency.component';
import { AuditComNetworkComponent } from './pages/audit-com-network.component';

export const AUDIT_COMMERCE_ROUTES: Routes = [
  {
    path: '',
    component: AuditCommerceShellComponent,
    children: [
      { path: '', component: AuditComNetworkComponent },
      { path: 'agence/:agencyId', component: AuditComAgencyComponent },
    ],
  },
];
