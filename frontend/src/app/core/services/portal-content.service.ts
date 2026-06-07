import { Injectable, computed, signal } from '@angular/core';
import { StorageKey } from '../models/storage-keys';
import { StorageService } from '../storage/storage.service';

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

export const DEFAULT_ACTUS: Actu[] = [
  {
    id: 1,
    cat: 'reseau',
    lbl: 'Réseau',
    date: '28 avril 2026',
    title: 'Lancement du programme Qualité 2026',
    body: "Le nouveau référentiel qualité entre en vigueur dès le 1er mai. Tous les franchisés doivent mettre à jour leur manuel opératoire d'ici le 15 mai.",
  },
  {
    id: 2,
    cat: 'comm',
    lbl: 'Communication',
    date: '22 avril 2026',
    title: 'Nouvelle campagne nationale : « Vivez naturellement »',
    body: 'La campagne printanière démarre le 5 mai. Supports disponibles dans Documentation > Communication.',
  },
  {
    id: 3,
    cat: 'rh',
    lbl: 'RH & Formation',
    date: '15 avril 2026',
    title: 'Formation vendeur certifié — mai',
    body: 'Inscriptions ouvertes pour les sessions du 20 mai (en ligne) et du 12 juin (Lyon). 12 personnes max.',
  },
  {
    id: 4,
    cat: 'ops',
    lbl: 'Opérations',
    date: '8 avril 2026',
    title: 'Mise à jour OssatureTrack v3.2',
    body: 'Nouvelle version avec le module ossature bois amélioré. Mise à jour automatique ce week-end.',
  },
];

export const DEFAULT_EVENTS: PortalEvent[] = [
  { id: 1, day: '12', mon: 'Mai', title: 'Convention réseau annuelle', detail: 'Hôtel Mercure — Lyon · 9h–18h', tag: 'event', tlbl: 'Événement' },
  {
    id: 2,
    day: '20',
    mon: 'Mai',
    title: 'Formation vendeur certifié (en ligne)',
    detail: 'Zoom · 9h–17h · 12 participants max',
    tag: 'formation',
    tlbl: 'Formation',
  },
  {
    id: 3,
    day: '28',
    mon: 'Mai',
    title: 'Réunion coordination qualité',
    detail: 'Siège Maisons Naturéa · 14h–17h',
    tag: 'reunion',
    tlbl: 'Réunion',
  },
  {
    id: 4,
    day: '03',
    mon: 'Juin',
    title: 'Visite franchisé — Bordeaux',
    detail: 'Agence Bordeaux Lac · journée entière',
    tag: 'visite',
    tlbl: 'Visite franchisé',
  },
  {
    id: 5,
    day: '12',
    mon: 'Juin',
    title: 'Formation vendeur certifié (Lyon)',
    detail: 'Espace formation Lyon · 9h–17h',
    tag: 'formation',
    tlbl: 'Formation',
  },
  { id: 6, day: '19', mon: 'Juin', title: 'Codir réseau T2', detail: 'Visioconférence · 10h–12h', tag: 'reunion', tlbl: 'Réunion' },
];

const MOIS = ['Jan', 'Fév', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

@Injectable({ providedIn: 'root' })
export class PortalContentService {
  private readonly _version = signal(0);

  readonly actus = computed(() => {
    this._version();
    return this.readActus();
  });

  readonly events = computed(() => {
    this._version();
    return this.readEvents();
  });

  readonly newsletter = computed(() => {
    this._version();
    return this.storage.get<Newsletter>(StorageKey.Newsletter);
  });

  constructor(private readonly storage: StorageService) {}

  addActu(input: { cat: string; lbl: string; date: string; title: string; body: string }): void {
    const actus = this.readActus();
    const newId = actus.length ? Math.max(...actus.map((a) => a.id)) + 1 : 1;
    this.storage.set(StorageKey.Actus, [{ id: newId, ...input }, ...actus]);
    this._version.update((v) => v + 1);
  }

  deleteActu(id: number): void {
    this.storage.set(
      StorageKey.Actus,
      this.readActus().filter((a) => a.id !== id),
    );
    this._version.update((v) => v + 1);
  }

  addEvent(input: { dateIso: string; tag: string; tlbl: string; title: string; detail: string }): void {
    const events = this.readEvents();
    const d = new Date(input.dateIso);
    const day = String(d.getDate()).padStart(2, '0');
    const mon = MOIS[d.getMonth()];
    const newId = events.length ? Math.max(...events.map((e) => e.id)) + 1 : 1;
    const item: PortalEvent = {
      id: newId,
      day,
      mon,
      title: input.title,
      detail: input.detail,
      tag: input.tag,
      tlbl: input.tlbl,
      _ts: d.getTime(),
    };
    const next = [...events, item].sort((a, b) => (a._ts ?? 0) - (b._ts ?? 0));
    this.storage.set(StorageKey.Events, next);
    this._version.update((v) => v + 1);
  }

  deleteEvent(id: number): void {
    this.storage.set(
      StorageKey.Events,
      this.readEvents().filter((e) => e.id !== id),
    );
    this._version.update((v) => v + 1);
  }

  saveNewsletter(nl: Newsletter | null): void {
    if (nl) this.storage.set(StorageKey.Newsletter, nl);
    else this.storage.remove(StorageKey.Newsletter);
    this._version.update((v) => v + 1);
  }

  formatActuDate(iso: string): string {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private readActus(): Actu[] {
    const v = this.storage.get<Actu[]>(StorageKey.Actus);
    if (Array.isArray(v) && v.length) return v;
    return DEFAULT_ACTUS;
  }

  private readEvents(): PortalEvent[] {
    const v = this.storage.get<PortalEvent[]>(StorageKey.Events);
    if (Array.isArray(v) && v.length) return v;
    return DEFAULT_EVENTS;
  }
}
