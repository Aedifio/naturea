import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { portalActuCatLabel } from '../constants/portal-actu-cats.constants';
import { portalEventTagLabel } from '../constants/portal-event-tags.constants';
import { portalNewsletterTypeLabel } from '../constants/portal-newsletter-types.constants';
import { SupabaseService } from '../supabase/supabase.service';

export interface Actu {
  id: number;
  cat: string;
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
  cat: string;
  published_date: string;
  title: string;
  body: string;
  created_by: string | null;
}

interface EventRow {
  id: number;
  title: string;
  detail: string;
  tag: string;
  event_date: string;
  created_by: string | null;
}

interface NewsletterRow {
  id: number;
  type: 'pdf' | 'text' | null;
  content: string | null;
  name: string | null;
  published_date: string | null;
  created_by: string | null;
}

@Injectable({ providedIn: 'root' })
export class PortalContentService {
  private readonly supabase = inject(SupabaseService);
  private readonly injector = inject(Injector);
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
      this.supabase.from('portal_actus').select('*').order('published_date', { ascending: false }),
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
      this._newsletter.set(row?.type && row.content ? this.rowToNewsletter(row) : null);
    }

    this._ready.set(true);
  }

  async addActu(input: { cat: string; dateIso: string; title: string; body: string }): Promise<void> {
    const { error } = await this.supabase.from('portal_actus').insert({
      cat: input.cat,
      published_date: input.dateIso.slice(0, 10),
      title: input.title,
      body: input.body,
      created_by: this.getCurrentCreatorId(),
    });
    if (error) throw error;
    await this.load();
  }

  async deleteActu(id: number): Promise<void> {
    const { error } = await this.supabase.from('portal_actus').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  }

  async addEvent(input: { dateIso: string; tag: string; title: string; detail: string }): Promise<void> {
    const { error } = await this.supabase.from('portal_events').insert({
      title: input.title,
      detail: input.detail,
      tag: input.tag,
      event_date: input.dateIso.slice(0, 10),
      created_by: this.getCurrentCreatorId(),
    });
    if (error) throw error;
    await this.load();
  }

  async deleteEvent(id: number): Promise<void> {
    const { error } = await this.supabase.from('portal_events').delete().eq('id', id);
    if (error) throw error;
    await this.load();
  }

  async saveNewsletter(input: { type: 'pdf' | 'text'; content: string; name: string; dateIso: string } | null): Promise<void> {
    if (input) {
      const { error } = await this.supabase.from('portal_newsletter').upsert({
        id: 1,
        type: input.type,
        content: input.content,
        name: input.name,
        published_date: input.dateIso.slice(0, 10),
        created_by: this.getCurrentCreatorId(),
      });
      if (error) throw error;
    } else {
      const { error } = await this.supabase.from('portal_newsletter').delete().eq('id', 1);
      if (error) throw error;
    }
    await this.load();
  }

  formatActuDate(iso: string): string {
    return this.parseIsoDate(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  actuCatLabel(cat: string): string {
    return portalActuCatLabel(cat);
  }

  eventTagLabel(tag: string): string {
    return portalEventTagLabel(tag);
  }

  newsletterTypeLabel(type: string): string {
    return portalNewsletterTypeLabel(type);
  }

  private rowToActu(row: ActuRow): Actu {
    return {
      id: row.id,
      cat: row.cat,
      date: this.formatActuDate(row.published_date),
      title: row.title,
      body: row.body,
    };
  }

  private rowToNewsletter(row: NewsletterRow): Newsletter {
    return {
      type: row.type!,
      content: row.content!,
      name: row.name ?? '',
      date: row.published_date ? this.formatActuDate(row.published_date) : '',
    };
  }

  private rowToEvent(row: EventRow): PortalEvent {
    const d = this.parseIsoDate(row.event_date);
    return {
      id: row.id,
      day: String(d.getDate()).padStart(2, '0'),
      mon: MOIS[d.getMonth()],
      title: row.title,
      detail: row.detail,
      tag: row.tag,
      _ts: d.getTime(),
    };
  }

  private getCurrentCreatorId(): string | null {
    return this.injector.get(AuthService).portalUserId();
  }

  /** Parse YYYY-MM-DD without UTC day shift. */
  private parseIsoDate(isoDate: string): Date {
    const [y, m, day] = isoDate.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, day);
  }
}
