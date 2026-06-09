import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { permissionGuard } from './core/auth/permission.guard';
import { LoginLayoutComponent } from './layouts/login-layout/login-layout.component';
import { PortalLayoutComponent } from './layouts/portal-layout/portal-layout.component';
import { LoginComponent } from './features/auth/login/login.component';
import { HomeComponent } from './features/home/home.component';
import { ReseauComponent } from './features/reseau/reseau.component';
import { AdminComponent } from './features/admin/admin.component';
import { AdminRolesComponent } from './features/admin/admin-roles.component';
import { AdminFactoriesComponent } from './features/admin/admin-factories.component';
import { AdminAgenciesComponent } from './features/admin/admin-agencies.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginLayoutComponent,
    canActivate: [guestGuard],
    children: [{ path: '', component: LoginComponent }],
  },
  {
    path: '',
    canActivate: [authGuard],
    children: [
      {
        path: '',
        component: PortalLayoutComponent,
        children: [
          { path: '', redirectTo: 'home', pathMatch: 'full' },
          { path: 'home', component: HomeComponent },
          { path: 'reseau', component: ReseauComponent, canActivate: [permissionGuard('RESEAU')] },
          { path: 'admin', component: AdminComponent, canActivate: [permissionGuard('ADMIN')] },
          { path: 'admin/roles', component: AdminRolesComponent, canActivate: [permissionGuard('ADMIN')] },
          { path: 'admin/factories', component: AdminFactoriesComponent, canActivate: [permissionGuard('ADMIN')] },
          { path: 'admin/agencies', component: AdminAgenciesComponent, canActivate: [permissionGuard('ADMIN')] },
        ],
      },
      {
        path: 'apps/codir',
        canActivate: [permissionGuard('CODIR')],
        loadChildren: () => import('./features/codir/codir.routes').then((m) => m.CODIR_ROUTES),
      },
      {
        path: 'apps/recrutement',
        canActivate: [permissionGuard('RECRUT')],
        loadChildren: () => import('./features/recrutement/recrutement.routes').then((m) => m.RECRUTEMENT_ROUTES),
      },
      {
        path: 'apps/ossature',
        canActivate: [permissionGuard('OSSATURE')],
        loadChildren: () => import('./features/ossature/ossature.routes').then((m) => m.OSSATURE_ROUTES),
      },
      {
        path: 'apps/audit-technique',
        canActivate: [permissionGuard('AUDIT')],
        loadChildren: () => import('./features/audit-technique/audit-technique.routes').then((m) => m.AUDIT_TECHNIQUE_ROUTES),
      },
      {
        path: 'apps/chiffrage',
        canActivate: [permissionGuard('CHIFFRAGE')],
        loadChildren: () => import('./features/chiffrage/chiffrage.routes').then((m) => m.CHIFFRAGE_ROUTES),
      },
      {
        path: 'apps/audit-commerce',
        canActivate: [permissionGuard('AUDIT_COM')],
        loadChildren: () => import('./features/audit-commerce/audit-commerce.routes').then((m) => m.AUDIT_COMMERCE_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
