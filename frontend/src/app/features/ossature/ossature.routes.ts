import { Routes } from '@angular/router';
import { ossatureFullAccessGuard } from './guards/ossature-full-access.guard';
import { OssatureShellComponent } from './ossature-shell.component';
import { OssatureArchivesComponent } from './pages/ossature-archives.component';
import { OssatureCoordComponent } from './pages/ossature-coord.component';
import { OssatureFranchiseComponent } from './pages/ossature-franchise.component';
import { OssatureUsineComponent } from './pages/ossature-usine.component';

export const OSSATURE_ROUTES: Routes = [
  {
    path: '',
    component: OssatureShellComponent,
    children: [
      { path: '', component: OssatureCoordComponent, canActivate: [ossatureFullAccessGuard] },
      { path: 'franchise', component: OssatureFranchiseComponent, canActivate: [ossatureFullAccessGuard] },
      { path: 'usine', component: OssatureUsineComponent },
      { path: 'archives', component: OssatureArchivesComponent },
    ],
  },
];
