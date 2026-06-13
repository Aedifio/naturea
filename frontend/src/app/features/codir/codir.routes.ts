import { Routes } from '@angular/router';
import { TabsAppLayoutComponent } from '../../layouts/tabs-app-layout/tabs-app-layout.component';
import {
  CodirActionsComponent,
  CodirArchivesComponent,
  CodirDashboardComponent,
  CodirTeamComponent,
} from './codir-pages.component';

export const CODIR_ROUTES: Routes = [
  {
    path: '',
    component: TabsAppLayoutComponent,
    data: {
      layout: {
        variant: 'codir',
        appCode: 'CODIR',
        title: 'CODIR',
        tag: "Le codir d'alfred",
        showLogo: true,
        navItems: [
          { label: 'Tableau de bord', route: '/apps/codir', iconName: 'layout' },
          { label: "Plan d'action", route: '/apps/codir/actions', iconName: 'list' },
          { label: 'Archives', route: '/apps/codir/archives', iconName: 'archive' },
          { label: 'Équipe', route: '/apps/codir/equipe', iconName: 'users' },
        ],
      },
    },
    children: [
      { path: '', component: CodirDashboardComponent },
      { path: 'actions', component: CodirActionsComponent },
      { path: 'archives', component: CodirArchivesComponent },
      { path: 'equipe', component: CodirTeamComponent },
    ],
  },
];
