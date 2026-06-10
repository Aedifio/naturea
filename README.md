# Maisons Naturéa — Portail Réseau

Angular 19 SPA for the Naturéa franchise network portal. **Data and files are stored in [Supabase](https://supabase.com)** (Postgres + Storage + Auth).

## Local development

```bash
cd frontend
cp .env.example .env   # fill SUPABASE_URL, SUPABASE_ANON_KEY and SENTRY_DSN
npm ci
npm start
```

`npm start` runs `scripts/write-environment.mjs`, which reads `frontend/.env` and generates gitignored `src/environments/environment.ts` and `environment.prod.ts`. **Never commit credentials** — only `.env.example` and empty `environment.example.ts` live in the repo. Missing variables cause the script to exit with an error. Open [http://localhost:4200](http://localhost:4200).

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

See [`render.yaml`](render.yaml). The app runs as a **Node Web Service** — `frontend/server.mjs` serves the Angular build and falls back to `index.html` for all client-side routes (fixes blank pages on refresh). Render **does not** read Netlify-style `public/_redirects`.

| Setting | Value |
|--------|--------|
| Runtime | **Node** |
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Start command | `node server.mjs` |

**Important:** In Render Dashboard → **Settings → Build & Deploy**, confirm:
- Runtime is **Node** (not Static Site)
- Start command is `node server.mjs` (not `npm start` / `ng serve`)
- Build command is `npm ci && npm run build` — it already runs `write-environment.mjs`; do **not** use `cd .. && node scripts/write-environment.mjs`
- Remove any **Redirects/Rewrites** rules from the Static Site era — the Node server handles routing

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
| `SENTRY_DSN` | Sentry project DSN (Settings → Client Keys) |
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
| `factory` | Usine metadata (nom, couleur, contact, description) — shared by chiffrage + ossature |

### 4. API keys

Copy **Project URL** and **anon public key** into Render env vars. Never expose the `service_role` key in the Angular app.

## Architecture

- **Auth**: Supabase Auth → `portal_users` profile
- **App data**: normalized Postgres tables (`portal_actus`, `recrutement_candidats`, `codir_*`, etc.)
- **Legacy KV**: `app_kv_store` retained for audit-commerce document metadata and auth session cache only
- **Files**: Supabase Storage + `portal_files` metadata
