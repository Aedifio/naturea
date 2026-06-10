import { Routes } from '@angular/router';
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
      { path: '', component: OssatureCoordComponent },
      { path: 'franchise', component: OssatureFranchiseComponent },
      { path: 'usine', component: OssatureUsineComponent },
      { path: 'archives', component: OssatureArchivesComponent },
    ],
  },
];
