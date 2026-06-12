import { Injectable, computed, inject, signal } from '@angular/core';
import { findAgency, normAgency } from '../models/kpi.model';
import { Agency, AgencyCreate, AgencyUpdate } from '../models/agency.model';
import { SupabaseService } from '../supabase/supabase.service';

interface AgencyRow {
  id: number;
  name: string;
  ville: string | null;
  adresse: string | null;
  slug: string | null;
  contact_email: string | null;
  actif: boolean;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class AgencyService {
  private readonly supabase = inject(SupabaseService);

  private readonly _agencies = signal<Agency[]>([]);
  private readonly _ready = signal(false);

  readonly agencies = computed(() => this._agencies());
  readonly ready = this._ready.asReadonly();

  async load(): Promise<void> {
    const { data, error } = await this.supabase
      .from('agencies')
      .select('*')
      .eq('archived', false)
      .order('name');

    if (error) {
      console.error('[Agency] load failed', error);
      this._agencies.set([]);
    } else {
      this._agencies.set((data as AgencyRow[] | null) ?? []);
    }
    this._ready.set(true);
  }

  getAll(): Agency[] {
    return this._agencies();
  }

  getById(id: number): Agency | null {
    return this._agencies().find((a) => a.id === id) ?? null;
  }

  getNames(): string[] {
    return this._agencies().map((a) => a.name);
  }

  /** Maps a franchise label (order text, portal user) to a canonical agency name. */
  resolveFranchiseName(label: string): string | null {
    const agency = findAgency(this._agencies(), label, (a) => a.name);
    return agency?.name ?? null;
  }

  /** Maps a franchise label to canonical `agencies.id`. */
  resolveAgencyId(label: string): number | null {
    return findAgency(this._agencies(), label, (a) => a.name)?.id ?? null;
  }

  /** Whether an order's franchise field belongs to the selected agency. */
  orderMatchesFranchise(orderFranchise: string, franchiseName: string): boolean {
    if (!orderFranchise || !franchiseName) return false;
    const resolved = this.resolveFranchiseName(franchiseName) ?? franchiseName;
    const t = normAgency(resolved);
    const n = normAgency(orderFranchise);
    return !!(n && t && (n === t || n.includes(t) || t.includes(n)));
  }

  /** Franchise name on orders → contact email from `agencies`. */
  getEmailForFranchise(franchiseName: string): string {
    const agency = findAgency(this._agencies(), franchiseName, (a) => a.name);
    return agency?.contact_email?.trim() ?? '';
  }

  /** Portal user franchise picker: siège + non-archived agencies (includes disabled). */
  getFranchiseOptions(): string[] {
    return ['(siège)', ...this.getNames()];
  }

  async listAdmin(): Promise<Agency[]> {
    const { data, error } = await this.supabase.rpc('list_agencies_admin');
    if (error) throw error;
    return (data ?? []) as AgencyRow[];
  }

  async create(input: AgencyCreate): Promise<Agency> {
    const { data, error } = await this.supabase.rpc('admin_create_agency', {
      p_name: input.name.trim(),
      p_ville: input.ville.trim() || null,
      p_adresse: input.adresse.trim() || null,
      p_contact_email: input.contact_email.trim() || null,
    });
    if (error) throw error;
    await this.load();
    return data as Agency;
  }

  async update(id: number, input: AgencyUpdate): Promise<Agency> {
    const { data, error } = await this.supabase.rpc('admin_update_agency', {
      p_id: id,
      p_name: input.name.trim(),
      p_ville: input.ville.trim() || null,
      p_adresse: input.adresse.trim() || null,
      p_contact_email: input.contact_email.trim() || null,
      p_actif: input.status === 'active',
      p_archived: input.status === 'archived',
    });
    if (error) throw error;
    await this.load();
    return data as Agency;
  }
}
