import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { APPS_META } from '../../core/models/permissions.model';
import { permissionLabel } from '../../core/models/kpi.model';
import { KpiService } from '../../core/services/kpi.service';
import { PortalContentService } from '../../core/services/portal-content.service';
import { KpiGridComponent } from '../../shared/components/kpi-grid/kpi-grid.component';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { PortalModalComponent, PortalModalType } from '../../shared/components/portal-modal/portal-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [PageHeroComponent, KpiGridComponent, RouterLink, PortalModalComponent],
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

  readonly franchiseDash = computed(() => {
    const u = this.user();
    if (!u) return null;
    const roles = ['Franchisé', 'Conducteur travaux', 'Commercial'];
    if (!roles.includes(u.role)) return null;
    const name = u.franchise;
    return {
      role: u.role,
      franchise: name,
      ossature: this.kpi.calcFranchiseOssature(name),
      chiffrage: this.kpi.calcFranchiseChiffrage(name),
      auditTech: this.kpi.calcFranchiseAuditTech(name),
      auditCom: this.kpi.calcFranchiseAuditCom(name),
    };
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

  formatEur(v: number): string {
    return v >= 1000 ? `${Math.round(v / 1000).toLocaleString('fr-FR')} k€` : `${Math.round(v)} €`;
  }

  newsletterPdfSrc(content: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(content);
  }

  public throwTestError(): void {
    throw new Error("Sentry Test Error");
  }
}
