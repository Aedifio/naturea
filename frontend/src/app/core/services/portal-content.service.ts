import { Injectable, computed, inject, signal } from '@angular/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface Actu {
  id: number;
  cat: string;
  lbl: string;
  date: string;
  title: string;
  body: string;
}

export interface PortalEvent {
  id: number;
  day: string;
  mon: string;
  title: string;
  detail: string;
  tag: string;
  tlbl: string;
  _ts?: number;
}

export interface Newsletter {
  type: 'pdf' | 'text';
  content: string;
  name: string;
  date: string;
}

const MOIS = ['Jan', 'Fév', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

interface ActuRow {
  id: number;
  legacy_id: number | null;
  cat: string;
  lbl: string;
  date_label: string;
  title: string;
  body: string;
}

interface EventRow {
  id: number;
  legacy_id: number | null;
  event_day: string;
  event_month: string;
  title: string;
  detail: string;
  tag: string;
  tag_label: string;
  event_date: string | null;
}

interface NewsletterRow {
  id: number;
  type: 'pdf' | 'text' | null;
  content: string | null;
  name: string | null;
  date_label: string | null;
}

@Injectable({ providedIn: 'root' })
export class PortalContentService {
  private readonly supabase = inject(SupabaseService);
  private readonly _actus = signal<Actu[]>([]);
  private readonly _events = signal<PortalEvent[]>([]);
  private readonly _newsletter = signal<Newsletter | null>(null);
  private readonly _ready = signal(false);

  readonly actus = computed(() => this._actus());
  readonly events = computed(() => this._events());
  readonly newsletter = computed(() => this._newsletter());
  readonly ready = this._ready.asReadonly();

  async load(): Promise<void> {
    const [actusRes, eventsRes, nlRes] = await Promise.all([
      this.supabase.from('portal_actus').select('*').order('legacy_id', { ascending: false }),
      this.supabase.from('portal_events').select('*').order('event_date', { ascending: true, nullsFirst: false }),
      this.supabase.from('portal_newsletter').select('*').eq('id', 1).maybeSingle(),
    ]);

    if (actusRes.error) console.error('[PortalContent] actus load failed', actusRes.error);
    else this._actus.set((actusRes.data as ActuRow[] ?? []).map((r) => this.rowToActu(r)));

    if (eventsRes.error) console.error('[PortalContent] events load failed', eventsRes.error);
    else this._events.set((eventsRes.data as EventRow[] ?? []).map((r) => this.rowToEvent(r)));

    if (nlRes.error) console.error('[PortalContent] newsletter load failed', nlRes.error);
    else {
      const row = nlRes.data as NewsletterRow | null;
      this._newsletter.set(row?.type && row.content ? {
        type: row.type,
        content: row.content,
        name: row.name ?? '',
        date: row.date_label ?? '',
      } : null);
    }

    this._ready.set(true);
  }

  async addActu(input: { cat: string; lbl: string; date: string; title: string; body: string }): Promise<void> {
    const legacyId = this._actus().length
      ? Math.max(...this._actus().map((a) => a.id)) + 1
      : 1;
    const { error } = await this.supabase.from('portal_actus').insert({
      legacy_id: legacyId,
      cat: input.cat,
      lbl: input.lbl,
      date_label: input.date,
      title: input.title,
      body: input.body,
    });
    if (error) throw error;
    await this.load();
  }

  async deleteActu(id: number): Promise<void> {
    const { error } = await this.supabase.from('portal_actus').delete().eq('legacy_id', id);
    if (error) throw error;
    await this.load();
  }

  async addEvent(input: { dateIso: string; tag: string; tlbl: string; title: string; detail: string }): Promise<void> {
    const events = this._events();
    const d = new Date(input.dateIso);
    const legacyId = events.length ? Math.max(...events.map((e) => e.id)) + 1 : 1;
    const { error } = await this.supabase.from('portal_events').insert({
      legacy_id: legacyId,
      event_day: String(d.getDate()).padStart(2, '0'),
      event_month: MOIS[d.getMonth()],
      title: input.title,
      detail: input.detail,
      tag: input.tag,
      tag_label: input.tlbl,
      event_date: input.dateIso.slice(0, 10),
    });
    if (error) throw error;
    await this.load();
  }

  async deleteEvent(id: number): Promise<void> {
    const { error } = await this.supabase.from('portal_events').delete().eq('legacy_id', id);
    if (error) throw error;
    await this.load();
  }

  async saveNewsletter(nl: Newsletter | null): Promise<void> {
    if (nl) {
      const { error } = await this.supabase.from('portal_newsletter').upsert({
        id: 1,
        type: nl.type,
        content: nl.content,
        name: nl.name,
        date_label: nl.date,
      });
      if (error) throw error;
    } else {
      const { error } = await this.supabase.from('portal_newsletter').delete().eq('id', 1);
      if (error) throw error;
    }
    await this.load();
  }

  formatActuDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private rowToActu(row: ActuRow): Actu {
    return {
      id: row.legacy_id ?? row.id,
      cat: row.cat,
      lbl: row.lbl,
      date: row.date_label,
      title: row.title,
      body: row.body,
    };
  }

  private rowToEvent(row: EventRow): PortalEvent {
    const ts = row.event_date ? new Date(row.event_date).getTime() : undefined;
    return {
      id: row.legacy_id ?? row.id,
      day: row.event_day,
      mon: row.event_month,
      title: row.title,
      detail: row.detail,
      tag: row.tag,
      tlbl: row.tag_label,
      _ts: ts,
    };
  }
}
