import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import type { Agency, AgencyCreate, AgencyUpdate } from '../../core/models/agency.model';
import { AgencyService } from '../../core/services/agency.service';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { AdminAgencyModalComponent, AdminAgencyModalMode } from './admin-agency-modal.component';
import { AdminModulesComponent } from './admin-modules.component';

@Component({
  selector: 'app-admin-agencies',
  standalone: true,
  imports: [DatePipe, PageHeroComponent, AdminModulesComponent, AdminAgencyModalComponent],
  templateUrl: './admin-agencies.component.html',
  styleUrl: './admin-agencies.component.scss',
})
export class AdminAgenciesComponent implements OnInit {
  private readonly agencyService = inject(AgencyService);

  readonly agencies = signal<Agency[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly modalMode = signal<AdminAgencyModalMode>('edit');
  readonly editingAgency = signal<Agency | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly subtitleHtml =
    'Crée et modifie les agences du réseau Naturéa. Les noms sont utilisés pour le rapprochement entre applications.';

  ngOnInit(): void {
    void this.loadAgencies();
  }

  async loadAgencies(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.agencies.set(await this.agencyService.listAdmin());
    } catch (err) {
      console.error('[Admin] load agencies failed', err);
      this.loadError.set('Impossible de charger les agences.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.saveError.set(null);
    this.modalMode.set('create');
    this.editingAgency.set(null);
    this.modalOpen.set(true);
  }

  openEdit(agency: Agency): void {
    this.saveError.set(null);
    this.modalMode.set('edit');
    this.editingAgency.set(agency);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingAgency.set(null);
    this.saveError.set(null);
  }

  async onCreate(input: AgencyCreate): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const created = await this.agencyService.create(input);
      this.agencies.update((list) => [...list, created].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      this.closeModal();
    } catch (err) {
      console.error('[Admin] create agency failed', err);
      this.saveError.set(this.formatSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  async onUpdate(patch: AgencyUpdate): Promise<void> {
    const agency = this.editingAgency();
    if (!agency) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.agencyService.update(agency.id, patch);
      this.agencies.update((list) =>
        list.map((a) => (a.id === updated.id ? updated : a)).sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      );
      this.closeModal();
    } catch (err) {
      console.error('[Admin] save agency failed', err);
      this.saveError.set(this.formatSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  trackAgency(a: Agency): number {
    return a.id;
  }

  private formatSaveError(err: unknown): string {
    const msg = this.extractErrorMessage(err);
    if (msg.includes('duplicate key') || msg.includes('agencies_name_key')) {
      return 'Ce nom d\'agence est déjà utilisé.';
    }
    if (msg.includes('Forbidden')) return 'Action réservée à l\'Animateur.';
    if (msg.includes('Name required')) return 'Le nom est obligatoire.';
    if (msg.length > 0 && msg.length < 200) return msg;
    return 'Enregistrement impossible. Réessaie.';
  }

  private extractErrorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as { message: string }).message);
    }
    return String(err ?? '');
  }
}
