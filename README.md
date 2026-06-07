# Maisons Naturéa — Portail Réseau

Angular 19 SPA for the Naturéa franchise network portal. **Data and files are stored in [Supabase](https://supabase.com)** (Postgres + Storage + Auth).

## Local development

```bash
cd frontend
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). Supabase credentials are in `frontend/src/environments/environment.ts`.

## Database & seeds

Migrations live in [`supabase/migrations/`](supabase/migrations/). Demo data is seeded into normalized tables by `20250612120000_seed_normalized_tables.sql`.

To regenerate JSON sources and the seed migration:

```bash
node scripts/generate-seeds.mjs
node scripts/export-normalized-seed.mjs   # writes supabase/migrations/20250612120000_seed_normalized_tables.sql
```

Apply migrations with Supabase CLI (`supabase db push`) or the Supabase Dashboard SQL editor.

Manual auth setup (not in migrations): [`supabase/seed/auth_users.sql`](supabase/seed/auth_users.sql), [`supabase/seed/portal_users.sql`](supabase/seed/portal_users.sql).

## Production build

```bash
cd frontend
npm ci
npm run build
```

Output: `frontend/dist/frontend/browser/`

For Render, env vars are injected before build via `scripts/write-environment.mjs`.

## Deploy on Render.com

See [`render.yaml`](render.yaml). Build command:

```bash
cd .. && node scripts/write-environment.mjs && cd frontend && npm ci && npm run build
```

| Setting | Value |
|--------|--------|
| Root directory | `frontend` |
| Publish directory | `dist/frontend/browser` |
| Rewrite rule | `/*` → `/index.html` |

### Render environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | `https://rrhaubqmcetgmjhqweyr.supabase.co` |
| `SUPABASE_ANON_KEY` | Anon/public key from Supabase Dashboard → Settings → API |
| `NODE_VERSION` | `20` |

## Supabase manual configuration

Project: **naturea** (`eu-west-3`, ref `rrhaubqmcetgmjhqweyr`)

### 1. Authentication

- Enable **Email** provider
- Disable email confirmation for demo (or configure SMTP)
- **Site URL**: your Render URL (e.g. `https://naturea-portal.onrender.com`)
- **Redirect URLs**: `http://localhost:4200/**`, production URL

### 2. Create Auth users

Create users in **Authentication → Users** matching [`portal_users`](supabase/seed/portal_users.sql), or run [`auth_users.sql`](supabase/seed/auth_users.sql) in the SQL Editor.

Then link profiles:

```sql
UPDATE portal_users pu
SET auth_user_id = au.id
FROM auth.users au
WHERE lower(pu.email) = lower(au.email);
```

### 3. Storage

Six private buckets are created by migration `20250608120000_storage_auth_seed.sql`:

| Bucket | Use |
|--------|-----|
| `audit-commerce` | Excel/image imports |
| `recrutement` | Candidat documents |
| `audit-technique` | Chantier photos |
| `ossature` | Devis, plans, signatures |
| `chiffrage` | PDF tarif imports |
| `portal` | Newsletter PDF |

### 4. API keys

Copy **Project URL** and **anon public key** into Render env vars. Never expose the `service_role` key in the Angular app.

## Demo accounts

After Auth users are created and linked:

| Email | Password | Role |
|-------|----------|------|
| `animateur@maisons-naturea.fr` | `anim2026!` | Animateur |
| `directeur@maisons-naturea.fr` | `codir2026!` | Codir |
| `test.franchise@naturea.fr` | `test2026!` | Franchisé |
| `commercial.a@naturea.fr` | `comm2026!` | Commercial |
| `admin.a@naturea.fr` | `adm2026!` | Assistant·e admin |

See [`supabase/seed/auth_users.sql`](supabase/seed/auth_users.sql) for demo passwords.

## Architecture

- **Auth**: Supabase Auth → `portal_users` profile
- **App data**: normalized Postgres tables (`portal_actus`, `recrutement_candidats`, `codir_*`, etc.)
- **Legacy KV**: `app_kv_store` retained for audit-commerce document metadata and auth session cache only
- **Files**: Supabase Storage + `portal_files` metadata
