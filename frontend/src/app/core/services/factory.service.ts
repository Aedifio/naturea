import { Injectable, computed, inject, signal } from '@angular/core';
import {
  Factory,
  FactoryCreate,
  FactoryUpdate,
  factoryKeyToOssatureSite,
  ossatureSiteToFactoryKey,
} from '../models/factory.model';
import { SupabaseService } from '../supabase/supabase.service';

interface FactoryRow {
  id: number;
  key: string;
  nom: string;
  couleur: string;
  description: string | null;
  contact_email: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class FactoryService {
  private readonly supabase = inject(SupabaseService);

  private readonly _factories = signal<Factory[]>([]);
  private readonly _byKey = computed(() => {
    const map = new Map<string, Factory>();
    for (const f of this._factories()) {
      map.set(f.key, f);
    }
    return map;
  });
  private readonly _ready = signal(false);

  readonly factories = computed(() => this._factories());
  readonly ready = this._ready.asReadonly();
  readonly ossatureSites = computed(() => this.buildOssatureSites());

  async load(): Promise<void> {
    const { data, error } = await this.supabase
      .from('factory')
      .select('*')
      .eq('actif', true)
      .order('nom');

    if (error) {
      console.error('[Factory] load failed', error);
      this._factories.set([]);
    } else {
      this._factories.set((data as FactoryRow[] | null) ?? []);
    }
    this._ready.set(true);
  }

  getAll(): Factory[] {
    return this._factories();
  }

  getByKey(key: string): Factory | null {
    return this._byKey().get(key) ?? null;
  }

  getById(id: number): Factory | null {
    return this._factories().find((f) => f.id === id) ?? null;
  }

  getNom(key: string): string {
    return this.getByKey(key)?.nom ?? key;
  }

  /** Active factory site labels for Ossature (order.site values). */
  getOssatureSites(): string[] {
    return this.ossatureSites();
  }

  getFactoryByOssatureSite(site: string): Factory | null {
    return this.getByKey(ossatureSiteToFactoryKey(site));
  }

  /** Merges DB sites with extra labels (e.g. legacy orders). */
  mergeOssatureSites(...extra: string[]): string[] {
    const merged = new Set([...this.getOssatureSites(), ...extra.filter(Boolean)]);
    return [...merged].sort((a, b) => a.localeCompare(b, 'fr'));
  }

  getOssatureSiteAddress(site: string): string {
    const description = this.getFactoryByOssatureSite(site)?.description?.trim();
    if (description) return description;
    return '—';
  }

  /** Ossature site label (e.g. IMAJ) → contact email from `factory`. */
  getEmailForOssatureSite(site: string): string {
    const email = this.getFactoryByOssatureSite(site)?.contact_email;
    return email?.trim() ?? '';
  }

  private buildOssatureSites(): string[] {
    return this._factories().map((f) => factoryKeyToOssatureSite(f.key));
  }

  async listAdmin(): Promise<Factory[]> {
    const { data, error } = await this.supabase.rpc('list_factories_admin');
    if (error) throw error;
    return (data ?? []) as FactoryRow[];
  }

  async create(input: FactoryCreate): Promise<Factory> {
    const { data, error } = await this.supabase.rpc('admin_create_factory', {
      p_key: input.key.trim(),
      p_nom: input.nom.trim(),
      p_couleur: input.couleur.trim(),
      p_description: input.description.trim() || null,
      p_contact_email: input.contact_email.trim() || null,
      p_actif: input.actif,
    });
    if (error) throw error;
    await this.load();
    return data as Factory;
  }

  async update(id: number, input: FactoryUpdate): Promise<Factory> {
    const { data, error } = await this.supabase.rpc('admin_update_factory', {
      p_id: id,
      p_nom: input.nom.trim(),
      p_couleur: input.couleur.trim(),
      p_description: input.description.trim() || null,
      p_contact_email: input.contact_email.trim() || null,
      p_actif: input.actif,
    });
    if (error) throw error;
    await this.load();
    return data as Factory;
  }
}
