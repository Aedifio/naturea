-- =============================================================================
-- Maisons Naturéa — initial schema migration
-- Maps localStorage keys from CONTRAT_INTERFACES.md to Postgres tables.
--
-- localStorage key              → table(s)
-- ─────────────────────────────────────────────────────────────────────────────
-- codir:data:v4                 → codir_members, codir_actions
-- codir:currentUser             → (session; use auth + portal_users)
-- fhv3                          → recrutement_candidats
-- ossature_orders               → ossature_orders
-- naturea_pc_v1                 → audit_technique_agencies, audit_technique_audits,
--                                 audit_technique_corps
-- fnet:data:v1                  → audit_commerce_settings, audit_commerce_agencies,
--                                 audit_commerce_audits
-- chiffrage:mes_projets:v1      → chiffrage_projets
-- chiffrage:tarifs_history:v1   → chiffrage_tarifs_imports, chiffrage_tarifs_postes
-- chiffrage_overrides_v1        → chiffrage_overrides
-- chiffrage_form_overrides_v1   → chiffrage_form_overrides
-- chiffrage_custom_postes_v1    → chiffrage_custom_postes
-- naturea_active_user           → (session; written by portail on login)
-- naturea_actus                 → portal_actus
-- naturea_events                → portal_events
-- naturea_newsletter            → portal_newsletter
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "unaccent";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type codir_action_status as enum ('todo', 'in_progress', 'done', 'blocked');
create type codir_priority as enum ('low', 'medium', 'high');

create type ossature_statut as enum (
  'Devis demandé',
  'Devis envoyé',
  'Commande confirmée',
  'Expédition validée'
);

create type audit_ecart as enum ('urgent', 'mineur', 'corrige', 'conseil', 'nvu');
create type audit_rectif_status as enum ('en_attente', 'en_cours', 'corrige', 'reporte');

create type chiffrage_usine as enum (
  'boisboreal', 'cobs', 'sicob', 'imaj', 'savare', 'lowall'
);

create type portal_permission as enum ('R', 'RW', 'ADMIN');

-- ---------------------------------------------------------------------------
-- Shared reference: network agencies (17 franchises)
-- ---------------------------------------------------------------------------

create table public.agencies (
  id            serial primary key,
  legacy_id     integer unique,          -- id used in audit-technique app (1–17)
  name          text not null unique,    -- canonical name (match franchise / nom / name)
  ville         text,
  adresse       text,
  slug          text generated always as (
    lower(
      regexp_replace(
        unaccent(coalesce(name, '')),
        '[^a-z0-9]+', '-', 'g'
      )
    )
  ) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.agencies is
  'Canonical list of Naturéa franchises. Used for cross-app agency matching (normalized slug).';

-- ---------------------------------------------------------------------------
-- Portail: users, permissions, content
-- ---------------------------------------------------------------------------

create table public.portal_users (
  id            uuid primary key default gen_random_uuid(),
  legacy_id     integer unique,          -- id from portail USERS array
  auth_user_id  uuid unique references auth.users (id) on delete set null,
  email         text not null unique,
  name          text not null,
  role          text not null,
  franchise     text not null default '(siège)',
  actif         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.portal_role_permissions (
  role          text not null,
  app_slot      text not null,           -- RESEAU, CODIR, RECRUT, OSSATURE, AUDIT, AUDIT_COM, CHIFFRAGE, ADMIN
  permission    portal_permission,
  primary key (role, app_slot)
);

create table public.portal_actus (
  id            serial primary key,
  legacy_id     integer unique,
  cat           text not null,
  lbl           text not null,
  date_label    text not null,           -- display date e.g. "28 avril 2026"
  title         text not null,
  body          text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.portal_events (
  id            serial primary key,
  legacy_id     integer unique,
  event_day     text not null,
  event_month   text not null,
  title         text not null,
  detail        text not null,
  tag           text not null,
  tag_label     text not null,
  event_date    date,                    -- parsed date when available
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.portal_newsletter (
  id            smallint primary key default 1 check (id = 1),
  type          text check (type in ('pdf', 'text')),
  content       text,
  name          text,
  date_label    text,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- CODIR — codir:data:v4
-- ---------------------------------------------------------------------------

create table public.codir_members (
  id            text primary key,
  code          text not null,
  name          text not null,
  role          text not null default 'À renseigner',
  email         text not null default '',
  color         text not null default '#41532A',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.codir_themes (
  label         text primary key
);

create table public.codir_actions (
  id            text primary key,
  theme         text not null references public.codir_themes (label) on update cascade,
  title         text not null,
  description   text not null default '',
  owner_id      text references public.codir_members (id) on delete set null,
  co_owner_ids  text[] not null default '{}',
  owner_label   text not null default '',
  start_date    date,
  deadline      date,                    -- null = no deadline (KPI: included in "this week")
  deadline_note text not null default '',
  priority      codir_priority not null default 'medium',
  status        codir_action_status not null default 'todo',
  archived      boolean not null default false,
  archived_at   timestamptz,
  created_at    date,
  comments      jsonb not null default '[]',
  history       jsonb not null default '[]',
  subtasks      jsonb not null default '[]',
  updated_at    timestamptz not null default now()
);

create index codir_actions_deadline_idx on public.codir_actions (deadline) where not archived;
create index codir_actions_status_idx on public.codir_actions (status);
create index codir_actions_theme_idx on public.codir_actions (theme);

-- ---------------------------------------------------------------------------
-- Recrutement — fhv3
-- ---------------------------------------------------------------------------

create table public.recrutement_candidats (
  id            text primary key,
  prenom        text not null,
  nom           text not null,
  email         text not null,
  password_hash text,                    -- never store plaintext; hash on import
  tel           text,
  ville         text,
  cp            text,
  budget        text,
  zone          text,
  source        text,
  statut        text not null,
  stars         smallint check (stars between 0 and 5),
  date_label    text,                    -- app stores DD/MM/YYYY
  date_iso      date,                    -- parsed for KPI queries
  notes         text,
  documents     jsonb not null default '{}',
  disc          jsonb,
  questionnaire jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index recrutement_candidats_statut_idx on public.recrutement_candidats (statut);
create index recrutement_candidats_date_iso_idx on public.recrutement_candidats (date_iso);

-- ---------------------------------------------------------------------------
-- Ossature track — ossature_orders
-- ---------------------------------------------------------------------------

create table public.ossature_orders (
  id            text primary key,
  agency_id     integer references public.agencies (id) on delete set null,
  franchise     text not null,           -- ← lu by portail (denormalized for legacy match)
  reference     text not null,
  surface       text not null,
  plancher      text,
  site          text not null,
  statut        ossature_statut not null default 'Devis demandé',
  livraison     text not null,
  permis        text,
  docs          jsonb not null default '[]',
  docs_date     date,
  created       date not null default current_date,
  annee         integer not null default extract(year from current_date),
  payload       jsonb not null default '{}',  -- extra fields (client, date, etc.)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index ossature_orders_franchise_idx on public.ossature_orders (franchise);
create index ossature_orders_statut_idx on public.ossature_orders (statut);
create index ossature_orders_created_idx on public.ossature_orders (created);

-- ---------------------------------------------------------------------------
-- Audit technique — naturea_pc_v1
-- ---------------------------------------------------------------------------

create table public.audit_technique_agencies (
  id            integer primary key,   -- matches legacy agence id in app
  agency_id     integer references public.agencies (id) on delete set null,
  nom           text not null,
  ville         text,
  adresse       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.audit_technique_audits (
  id            text primary key,
  agence_id     integer not null references public.audit_technique_agencies (id) on delete cascade,
  audit_date    date not null,
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.audit_technique_corps (
  id            serial primary key,
  audit_id      text not null references public.audit_technique_audits (id) on delete cascade,
  corps_id      integer not null,        -- id within CORPS catalog
  code          text not null,
  label         text not null,
  note          numeric(3, 1) check (note is null or (note >= 0 and note <= 5)),
  ecart         audit_ecart,
  rectif_status audit_rectif_status not null default 'en_attente',
  rectif_note   text,
  commentaire   text,
  photos        jsonb not null default '[]',
  unique (audit_id, corps_id)
);

create index audit_technique_corps_ecart_idx
  on public.audit_technique_corps (ecart, rectif_status)
  where ecart = 'urgent' and rectif_status <> 'corrige';

create index audit_technique_audits_date_idx on public.audit_technique_audits (audit_date);

-- ---------------------------------------------------------------------------
-- Audit commerce — fnet:data:v1
-- ---------------------------------------------------------------------------

create table public.audit_commerce_settings (
  id              smallint primary key default 1 check (id = 1),
  version         integer not null default 2,
  threshold       numeric(4, 2) not null default 0.8,
  note_threshold  numeric(4, 1) not null default 5,
  updated_at      timestamptz not null default now()
);

create table public.audit_commerce_agencies (
  id            text primary key,
  agency_id     integer references public.agencies (id) on delete set null,
  name          text not null,
  objectives    jsonb not null default '{}',
  employees     jsonb not null default '[]',
  documents     jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table public.audit_commerce_audits (
  id            text primary key,
  agency_id     text not null references public.audit_commerce_agencies (id) on delete cascade,
  audit_date    date not null,
  status        text not null default 'draft',
  leaves        jsonb not null default '{}',   -- cli.signatures, cli.contact.*, etc.
  emp_ratings   jsonb not null default '{}',
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index audit_commerce_audits_date_idx on public.audit_commerce_audits (audit_date);
create index audit_commerce_audits_agency_date_idx
  on public.audit_commerce_audits (agency_id, audit_date);

-- ---------------------------------------------------------------------------
-- Chiffrage
-- ---------------------------------------------------------------------------

create table public.chiffrage_projets (
  id            bigint primary key,
  projet_date   timestamptz not null,
  nom           text not null,
  ref           text,
  usine         chiffrage_usine not null,
  usine_label   text,
  total         numeric(14, 2) not null default 0,
  agence        text,                    -- ← lu (from naturea_active_user.franchise)
  user_name     text,
  values        jsonb not null default '{}',
  lines         jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index chiffrage_projets_agence_idx on public.chiffrage_projets (agence);
create index chiffrage_projets_date_idx on public.chiffrage_projets (projet_date);

create table public.chiffrage_tarifs_imports (
  id            text primary key,
  date_import   timestamptz not null,
  filename      text,
  usine         text,
  devis_num     text,
  devis_date    text,
  client        text,
  total_ht      numeric(14, 2),
  created_at    timestamptz not null default now()
);

create table public.chiffrage_tarifs_postes (
  id            serial primary key,
  import_id     text not null references public.chiffrage_tarifs_imports (id) on delete cascade,
  label_pdf     text,
  unite         text,
  qte           numeric(14, 4),
  pu            numeric(14, 4),
  total         numeric(14, 2),
  mapped        boolean not null default false,
  ancien_pu     numeric(14, 4),
  delta_pct     numeric(8, 4),
  applique      boolean not null default false
);

create index chiffrage_tarifs_postes_applique_idx
  on public.chiffrage_tarifs_postes (import_id)
  where applique = true;

-- Internal chiffrage keys (not read by portail KPI)
create table public.chiffrage_overrides (
  id            smallint primary key default 1 check (id = 1),
  data          jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

create table public.chiffrage_form_overrides (
  id            smallint primary key default 1 check (id = 1),
  data          jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

create table public.chiffrage_custom_postes (
  id            smallint primary key default 1 check (id = 1),
  data          jsonb not null default '{}',
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Bridge table: 1:1 localStorage sync during migration (optional)
-- ---------------------------------------------------------------------------

create table public.app_kv_store (
  storage_key   text primary key,
  data          jsonb not null,
  updated_at    timestamptz not null default now()
);

comment on table public.app_kv_store is
  'Temporary bridge: mirrors localStorage keys 1:1 while apps migrate to normalized tables.';

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger agencies_updated_at before update on public.agencies
  for each row execute function public.set_updated_at();
create trigger portal_users_updated_at before update on public.portal_users
  for each row execute function public.set_updated_at();
create trigger portal_actus_updated_at before update on public.portal_actus
  for each row execute function public.set_updated_at();
create trigger portal_events_updated_at before update on public.portal_events
  for each row execute function public.set_updated_at();
create trigger codir_members_updated_at before update on public.codir_members
  for each row execute function public.set_updated_at();
create trigger codir_actions_updated_at before update on public.codir_actions
  for each row execute function public.set_updated_at();
create trigger recrutement_candidats_updated_at before update on public.recrutement_candidats
  for each row execute function public.set_updated_at();
create trigger ossature_orders_updated_at before update on public.ossature_orders
  for each row execute function public.set_updated_at();
create trigger audit_technique_agencies_updated_at before update on public.audit_technique_agencies
  for each row execute function public.set_updated_at();
create trigger audit_technique_audits_updated_at before update on public.audit_technique_audits
  for each row execute function public.set_updated_at();
create trigger audit_commerce_agencies_updated_at before update on public.audit_commerce_agencies
  for each row execute function public.set_updated_at();
create trigger audit_commerce_audits_updated_at before update on public.audit_commerce_audits
  for each row execute function public.set_updated_at();
create trigger chiffrage_projets_updated_at before update on public.chiffrage_projets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Seed: 17 network agencies (from audit-technique AGENCES_DEF)
-- ---------------------------------------------------------------------------

insert into public.agencies (legacy_id, name, ville, adresse) values
  (1,  'BOISILIA CONSTRUCTION',           'VILLEFRANCHE SUR SAÔNE', '277 rue d''Anse, 69400'),
  (2,  'TARN MAISON OSSATURE BOIS',       'ALBI',                   '4 rue du Foyer, 81600 BRENS'),
  (3,  'GP-MEOB',                         'ANNECY / CHAMBÉRY',      '2 rue Antoine Berthod, 74960'),
  (4,  'SARL LBROS',                      'ARRAS',                  'Za Carrefour de l''Artois, 62490'),
  (5,  'ECOHOME 84',                      'AVIGNON / REMOULINS',    '31 rue des Portes de la Tapy, 84170'),
  (6,  'BUGEY BRESSE CONSTRUCTIONS',      'BOURG EN BRESSE',        'Le centre village, 01250'),
  (7,  'ACVR HOME',                       'CAEN',                   'ZA Calix rue Pasteur, 14120'),
  (8,  'LDPCA CONSTRUCTIONS',             'CAHORS',                 '15 bis Bd Gambetta, 46000'),
  (9,  'E.M.A CONSTRUCTION',              'CHOLET / LA ROCHE SUR YON', '50 rue Eugène Bremond, 49300'),
  (10, 'MGCE',                            'ÉVRY',                   '85 route de Corbeil, 91700'),
  (11, 'CABINET APJ',                     'MONTPELLIER',            ''),
  (12, 'SAS BERTRAND CONSTRUCTIONS',      'RENNES',                 'Za du Haut Danté, 35520'),
  (13, 'OB CONCEPT',                      'RODEZ',                  '18 avenue de Bourran, 12000'),
  (14, 'EVABOIS',                         'SALON DE PROVENCE',      '46 chemin des Bastides, 13450'),
  (15, 'NATI BRETAGNE NORD',              'ST BRIEUC',              '23 rue de l''Ic, 22590'),
  (16, 'NOGOT CONCEPT',                   'TOURS',                  'ZA le Pilori, 37360'),
  (17, 'MO2B',                            'VAR / TOULON',           '210 rue de l''innovation, 83110');

insert into public.audit_technique_agencies (id, agency_id, nom, ville, adresse)
select legacy_id, id, name, ville, adresse from public.agencies;

insert into public.audit_commerce_settings (version, threshold, note_threshold)
values (2, 0.8, 5);

insert into public.portal_role_permissions (role, app_slot, permission) values
  ('Animateur',         'RESEAU',    'ADMIN'),
  ('Animateur',         'CODIR',     'ADMIN'),
  ('Animateur',         'RECRUT',    'ADMIN'),
  ('Animateur',         'OSSATURE',  'ADMIN'),
  ('Animateur',         'AUDIT',     'ADMIN'),
  ('Animateur',         'AUDIT_COM', 'ADMIN'),
  ('Animateur',         'CHIFFRAGE', 'ADMIN'),
  ('Animateur',         'ADMIN',     'ADMIN'),
  ('Codir',             'RESEAU',    'R'),
  ('Codir',             'CODIR',     'RW'),
  ('Codir',             'RECRUT',    'RW'),
  ('Codir',             'OSSATURE',  'R'),
  ('Codir',             'CHIFFRAGE', 'R'),
  ('Franchisé',         'OSSATURE',  'RW'),
  ('Franchisé',         'CHIFFRAGE', 'RW'),
  ('Commercial',        'OSSATURE',  'R'),
  ('Commercial',        'CHIFFRAGE', 'RW'),
  ('Conducteur travaux','OSSATURE',  'RW'),
  ('Conducteur travaux','CHIFFRAGE', 'RW');

-- ---------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ---------------------------------------------------------------------------

alter table public.agencies enable row level security;
alter table public.portal_users enable row level security;
alter table public.portal_role_permissions enable row level security;
alter table public.portal_actus enable row level security;
alter table public.portal_events enable row level security;
alter table public.portal_newsletter enable row level security;
alter table public.codir_members enable row level security;
alter table public.codir_themes enable row level security;
alter table public.codir_actions enable row level security;
alter table public.recrutement_candidats enable row level security;
alter table public.ossature_orders enable row level security;
alter table public.audit_technique_agencies enable row level security;
alter table public.audit_technique_audits enable row level security;
alter table public.audit_technique_corps enable row level security;
alter table public.audit_commerce_settings enable row level security;
alter table public.audit_commerce_agencies enable row level security;
alter table public.audit_commerce_audits enable row level security;
alter table public.chiffrage_projets enable row level security;
alter table public.chiffrage_tarifs_imports enable row level security;
alter table public.chiffrage_tarifs_postes enable row level security;
alter table public.chiffrage_overrides enable row level security;
alter table public.chiffrage_form_overrides enable row level security;
alter table public.chiffrage_custom_postes enable row level security;
alter table public.app_kv_store enable row level security;

-- Authenticated users: full access (refine per role when auth is wired)
create policy "authenticated_all_agencies"
  on public.agencies for all to authenticated using (true) with check (true);

create policy "authenticated_all_portal_users"
  on public.portal_users for all to authenticated using (true) with check (true);

create policy "authenticated_read_permissions"
  on public.portal_role_permissions for select to authenticated using (true);

create policy "authenticated_all_portal_actus"
  on public.portal_actus for all to authenticated using (true) with check (true);

create policy "authenticated_all_portal_events"
  on public.portal_events for all to authenticated using (true) with check (true);

create policy "authenticated_all_portal_newsletter"
  on public.portal_newsletter for all to authenticated using (true) with check (true);

create policy "authenticated_all_codir_members"
  on public.codir_members for all to authenticated using (true) with check (true);

create policy "authenticated_all_codir_themes"
  on public.codir_themes for all to authenticated using (true) with check (true);

create policy "authenticated_all_codir_actions"
  on public.codir_actions for all to authenticated using (true) with check (true);

create policy "authenticated_all_recrutement"
  on public.recrutement_candidats for all to authenticated using (true) with check (true);

create policy "authenticated_all_ossature"
  on public.ossature_orders for all to authenticated using (true) with check (true);

create policy "authenticated_all_audit_technique_agencies"
  on public.audit_technique_agencies for all to authenticated using (true) with check (true);

create policy "authenticated_all_audit_technique_audits"
  on public.audit_technique_audits for all to authenticated using (true) with check (true);

create policy "authenticated_all_audit_technique_corps"
  on public.audit_technique_corps for all to authenticated using (true) with check (true);

create policy "authenticated_all_audit_commerce_settings"
  on public.audit_commerce_settings for all to authenticated using (true) with check (true);

create policy "authenticated_all_audit_commerce_agencies"
  on public.audit_commerce_agencies for all to authenticated using (true) with check (true);

create policy "authenticated_all_audit_commerce_audits"
  on public.audit_commerce_audits for all to authenticated using (true) with check (true);

create policy "authenticated_all_chiffrage_projets"
  on public.chiffrage_projets for all to authenticated using (true) with check (true);

create policy "authenticated_all_chiffrage_tarifs_imports"
  on public.chiffrage_tarifs_imports for all to authenticated using (true) with check (true);

create policy "authenticated_all_chiffrage_tarifs_postes"
  on public.chiffrage_tarifs_postes for all to authenticated using (true) with check (true);

create policy "authenticated_all_chiffrage_overrides"
  on public.chiffrage_overrides for all to authenticated using (true) with check (true);

create policy "authenticated_all_chiffrage_form_overrides"
  on public.chiffrage_form_overrides for all to authenticated using (true) with check (true);

create policy "authenticated_all_chiffrage_custom_postes"
  on public.chiffrage_custom_postes for all to authenticated using (true) with check (true);

create policy "authenticated_all_app_kv_store"
  on public.app_kv_store for all to authenticated using (true) with check (true);

-- Public read on agencies reference (for unauthenticated landing if needed)
create policy "anon_read_agencies"
  on public.agencies for select to anon using (true);
