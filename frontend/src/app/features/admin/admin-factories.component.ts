import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import type { Factory, FactoryCreate, FactoryUpdate } from '../../core/models/factory.model';
import { FactoryService } from '../../core/services/factory.service';
import { PageHeroComponent } from '../../shared/components/page-hero/page-hero.component';
import { AdminFactoryModalComponent, AdminFactoryModalMode } from './admin-factory-modal.component';
import { AdminModulesComponent } from './admin-modules.component';

@Component({
  selector: 'app-admin-factories',
  standalone: true,
  imports: [DatePipe, PageHeroComponent, AdminModulesComponent, AdminFactoryModalComponent],
  templateUrl: './admin-factories.component.html',
  styleUrl: './admin-factories.component.scss',
})
export class AdminFactoriesComponent implements OnInit {
  private readonly factoryService = inject(FactoryService);

  readonly factories = signal<Factory[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);

  readonly modalOpen = signal(false);
  readonly modalMode = signal<AdminFactoryModalMode>('edit');
  readonly editingFactory = signal<Factory | null>(null);
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);

  readonly subtitleHtml =
    'Crée et modifie les usines du réseau (nom, couleur, contact). Les postes chiffrage restent dans le référentiel.';

  ngOnInit(): void {
    void this.loadFactories();
  }

  async loadFactories(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      this.factories.set(await this.factoryService.listAdmin());
    } catch (err) {
      console.error('[Admin] load factories failed', err);
      this.loadError.set('Impossible de charger les usines.');
    } finally {
      this.loading.set(false);
    }
  }

  openCreate(): void {
    this.saveError.set(null);
    this.modalMode.set('create');
    this.editingFactory.set(null);
    this.modalOpen.set(true);
  }

  openEdit(factory: Factory): void {
    this.saveError.set(null);
    this.modalMode.set('edit');
    this.editingFactory.set(factory);
    this.modalOpen.set(true);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.editingFactory.set(null);
    this.saveError.set(null);
  }

  async onCreate(input: FactoryCreate): Promise<void> {
    this.saving.set(true);
    this.saveError.set(null);
    try {
      const created = await this.factoryService.create(input);
      this.factories.update((list) => [...list, created].sort((a, b) => a.nom.localeCompare(b.nom, 'fr')));
      this.closeModal();
    } catch (err) {
      console.error('[Admin] create factory failed', err);
      this.saveError.set(this.formatSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  async onUpdate(patch: FactoryUpdate): Promise<void> {
    const factory = this.editingFactory();
    if (!factory) return;

    this.saving.set(true);
    this.saveError.set(null);
    try {
      const updated = await this.factoryService.update(factory.id, patch);
      this.factories.update((list) =>
        list.map((f) => (f.id === updated.id ? updated : f)).sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      );
      this.closeModal();
    } catch (err) {
      console.error('[Admin] save factory failed', err);
      this.saveError.set(this.formatSaveError(err));
    } finally {
      this.saving.set(false);
    }
  }

  trackFactory(f: Factory): number {
    return f.id;
  }

  private formatSaveError(err: unknown): string {
    const msg = this.extractErrorMessage(err);
    if (msg.includes('duplicate key') || msg.includes('factory_key_key')) {
      return 'Cette clé technique est déjà utilisée.';
    }
    if (msg.includes('Invalid key')) return 'Clé invalide : minuscules, chiffres et underscores uniquement.';
    if (msg.includes('Invalid couleur')) return 'Couleur invalide : format #RRGGBB attendu.';
    if (msg.includes('Invalid email')) return 'Email invalide.';
    if (msg.includes('Forbidden')) return 'Action réservée à l\'Animateur.';
    if (msg.includes('Nom required')) return 'Le nom est obligatoire.';
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
