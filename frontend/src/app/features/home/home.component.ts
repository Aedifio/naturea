import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { PORTAL_DASH_APPS } from '../../core/constants/portal-dash-apps.constants';
import { APPS_META } from '../../core/models/permissions.model';
import { AppCode } from '../../core/models/user.model';
import { KpiItem, permissionLabel } from '../../core/models/kpi.model';
import { KpiService } from '../../core/services/kpi.service';
import { PortalContentService } from '../../core/services/portal-content.service';
import { KpiGridComponent } from '../../shared/components/kpi-grid/kpi-grid.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PortalModalComponent, PortalModalType } from '../../shared/components/portal-modal/portal-modal.component';

const EMPTY_KPIS: KpiItem[] = [
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
  { label: 'Aucune donnée', value: '—', tone: 'muted' },
];

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PageHeroComponent, KpiGridComponent, RouterLink, PortalModalComponent, NgTemplateOutlet],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent {
  private readonly auth = inject(AuthService);
  private readonly kpi = inject(KpiService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly content = inject(PortalContentService);

  readonly user = this.auth.currentUser;
  readonly actus = this.content.actus;
  readonly events = this.content.events;
  readonly newsletter = this.content.newsletter;
  readonly isAnimateur = computed(() => this.auth.isAnimateur());
  readonly emptyKpis = EMPTY_KPIS;

  readonly auditTechniqueLink = computed(() => {
    const id = this.auth.linkedAgencyId();
    if (this.auth.isAgencyScopedFranchisee() && id != null) {
      return `/apps/audit-technique/agence/${id}`;
    }
    return '/apps/audit-technique';
  });

  readonly auditCommerceLink = computed(() => {
    const id = this.auth.linkedAgencyId();
    if (this.auth.isAgencyScopedFranchisee() && id != null) {
      return `/apps/audit-commerce/agence/${id}`;
    }
    return '/apps/audit-commerce';
  });

  /** Users without Réseau use /home as their app hub. */
  readonly usesHomeAsAppHub = computed(() => !this.canAccess('RESEAU'));

  readonly dashboardCards = computed(() => {
    if (!this.usesHomeAsAppHub()) return [];
    if (!this.user()) return [];

    return PORTAL_DASH_APPS.filter((a) => this.auth.canAccess(a.app)).map((a) => {
      let kpis: KpiItem[] | null = null;
      try {
        kpis = this.calcDashKpis(a.key);
      } catch {
        kpis = null;
      }
      const isEmpty = !kpis;
      return {
        ...a,
        route: this.routeForDashApp(a.app),
        kpis,
        isEmpty,
        footText: isEmpty ? 'Pas encore renseigné' : 'Données à jour',
      };
    });
  });

  readonly modalOpen = signal(false);
  readonly modalType = signal<PortalModalType>('actu');

  readonly heroStats = computed(() => {
    const u = this.user();
    if (!u) return [];
    const accessible = APPS_META.filter((a) => this.auth.canAccess(a.code)).length;
    return [
      { value: accessible, label: 'Apps accessibles' },
      { value: u.franchise === '(siège)' ? '17' : '1', label: u.franchise === '(siège)' ? 'Franchises' : 'Franchise' },
    ];
  });

  readonly greeting = computed(() => {
    const u = this.user();
    if (!u) return 'Bienvenue';
    const h = new Date().getHours();
    const greet = h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
    return `${greet}, ${u.name.split(' ')[0]} · ${u.role}`;
  });

  openModal(type: PortalModalType): void {
    this.modalType.set(type);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
  }

  async deleteActu(id: number): Promise<void> {
    if (!confirm('Supprimer cette actualité ?')) return;
    await this.content.deleteActu(id);
  }

  async deleteEvent(id: number): Promise<void> {
    if (!confirm('Supprimer cet événement ?')) return;
    await this.content.deleteEvent(id);
  }

  async deleteNewsletter(): Promise<void> {
    if (!confirm('Supprimer la newsletter actuelle ?')) return;
    await this.content.saveNewsletter(null);
  }

  onNewsletterPdf(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      void this.content.saveNewsletter({
        type: 'pdf',
        content: String(reader.result),
        name: file.name.replace(/\.pdf$/i, ''),
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
      });
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  permLabel(code: string): string {
    return permissionLabel(this.auth.getPermission(code as never));
  }

  canAccess(code: string): boolean {
    return this.auth.canAccess(code as never);
  }

  private routeForDashApp(code: AppCode): string {
    if (code === 'AUDIT') return this.auditTechniqueLink();
    if (code === 'AUDIT_COM') return this.auditCommerceLink();
    return PORTAL_DASH_APPS.find((a) => a.app === code)?.route ?? '/home';
  }

  private calcDashKpis(key: string): KpiItem[] | null {
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

  newsletterPdfSrc(content: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(content);
  }
}
