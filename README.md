# Maisons Naturéa — Portail Réseau

Angular 19 SPA for the Naturéa franchise network portal. **Data and files are stored in [Supabase](https://supabase.com)** (Postgres + Storage + Auth).

## Local development

```bash
cd frontend
cp .env.example .env   # then fill SUPABASE_URL and SUPABASE_ANON_KEY
npm ci
npm start
```

`npm start` runs `scripts/write-environment.mjs`, which reads `frontend/.env` and generates `src/environments/environment.ts`. Open [http://localhost:4200](http://localhost:4200).

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

`npm run build` also runs `write-environment.mjs` (requires `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the environment or `frontend/.env`).

## Deploy on Render.com

See [`render.yaml`](render.yaml). The app runs as a **Node web service** that serves the Angular build with SPA fallback (`frontend/server.mjs`). This fixes blank pages on browser refresh — Render **does not** read Netlify-style `public/_redirects`.

Build command:

```bash
npm ci && npm run build
```

Start command:

```bash
node server.mjs
```

| Setting | Value |
|--------|--------|
| Runtime | **Node** (not Static Site) |
| Root directory | `frontend` |
| Build command | see above |
| Start command | `node server.mjs` |

If the service was previously a **Static Site**, update it in the Render Dashboard (Settings → change to Web Service) or re-sync the Blueprint from `render.yaml`.

Local production smoke test:

```bash
cd frontend && npm run build && npm run start:prod
# open http://localhost:3000/apps/chiffrage and refresh — should stay on the app
```

### Render environment variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Project URL from Supabase Dashboard → Settings → API |
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

Create users in **Authentication → Users** matching [`portal_users`], or run [`auth_users.sql`] in the SQL Editor.

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

## Architecture

- **Auth**: Supabase Auth → `portal_users` profile
- **App data**: normalized Postgres tables (`portal_actus`, `recrutement_candidats`, `codir_*`, etc.)
- **Legacy KV**: `app_kv_store` retained for audit-commerce document metadata and auth session cache only
- **Files**: Supabase Storage + `portal_files` metadata
