import { Routes } from '@angular/router';
import { ChiffrageShellComponent } from './chiffrage-shell.component';
import { ChiffrageEstimerComponent } from './pages/chiffrage-estimer.component';
import { ChiffrageMesProjetsComponent } from './pages/chiffrage-mes-projets.component';
import { ChiffrageReferentielComponent } from './pages/chiffrage-referentiel.component';
import { ChiffrageHistoriqueComponent } from './pages/chiffrage-historique.component';
import { ChiffrageParametresComponent } from './pages/chiffrage-parametres.component';

export const CHIFFRAGE_ROUTES: Routes = [
  {
    path: '',
    component: ChiffrageShellComponent,
    children: [
      { path: '', component: ChiffrageEstimerComponent },
      { path: 'mes-projets', component: ChiffrageMesProjetsComponent },
      { path: 'referentiel', component: ChiffrageReferentielComponent },
      { path: 'historique', component: ChiffrageHistoriqueComponent },
      { path: 'parametres', component: ChiffrageParametresComponent },
    ],
  },
];
