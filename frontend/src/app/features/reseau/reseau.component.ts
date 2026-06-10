import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PORTAL_DASH_APPS } from '../../core/constants/portal-dash-apps.constants';
import { KpiItem } from '../../core/models/kpi.model';
import { KpiService } from '../../core/services/kpi.service';
import { KpiGridComponent } from '../../shared/components/kpi-grid/kpi-grid.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';

const RESEAU_APPS = PORTAL_DASH_APPS.filter((a) => a.app !== 'ADMIN').map((a) => ({
  ...a,
  kpiPublic: a.app === 'AUDIT' || a.app === 'AUDIT_COM',
}));

const EMPTY_KPIS: KpiItem[] = [
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
];

@Component({
  selector: 'app-reseau',
  standalone: true,
  imports: [PageHeroComponent, KpiGridComponent, RouterLink, NgTemplateOutlet],
  templateUrl: './reseau.component.html',
  styleUrl: './reseau.component.scss',
})
export class ReseauComponent {
  private readonly auth = inject(AuthService);
  private readonly kpi = inject(KpiService);
  private readonly tick = signal(0);

  readonly emptyKpis = EMPTY_KPIS;

  readonly cards = computed(() => {
    this.tick();
    return RESEAU_APPS.map((a) => {
      const perm = this.auth.getPermission(a.app as never);
      const canOpen = perm !== null;
      const locked = !canOpen && !a.kpiPublic;
      let kpis: KpiItem[] | null = null;
      if (!locked) {
        try {
          kpis = this.calcKpis(a.key);
        } catch {
          kpis = null;
        }
      }
      const isEmpty = !kpis;
      let footText = 'Données à jour';
      if (locked) footText = "Demande l'accès à l'animateur";
      else if (!canOpen) footText = 'Consultation réseau · ouverture réservée';
      else if (isEmpty) footText = 'Pas encore renseigné';

      return { ...a, perm, locked, canOpen, kpis, isEmpty, footText };
    });
  });

  readonly heroStats = computed(() => {
    const cards = this.cards().filter((c) => !c.locked);
    let appsActives = 0;
    let totalKpis = 0;
    let appsVides = 0;
    for (const c of cards) {
      if (c.isEmpty) appsVides++;
      else {
        appsActives++;
        totalKpis += c.kpis!.length;
      }
    }
    return [
      { value: `${appsActives}/${RESEAU_APPS.length}`, label: 'Apps actives' },
      { value: totalKpis, label: 'Indicateurs' },
      { value: appsVides, label: 'À renseigner', color: appsVides ? 'var(--terra2)' : undefined },
    ];
  });

  refresh(): void {
    this.tick.update((n) => n + 1);
  }

  private calcKpis(key: string): KpiItem[] | null {
    switch (key) {
      case 'codir':
        return this.kpi.calcCodirKPI();
      case 'recrut':
        return this.kpi.calcRecrutKPI();
      case 'ossature':
        return this.kpi.calcOssatureKPI();
      case 'audit':
        return this.kpi.calcAuditKPI();
      case 'audit_com':
        return this.kpi.calcAuditComKPI();
      case 'chiffrage':
        return this.kpi.calcChiffrageKPI();
      default:
        return null;
    }
  }
}
