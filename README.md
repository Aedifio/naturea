# Maisons Naturéa — Portail Réseau

Angular 19 SPA for the Naturéa franchise network portal (Chiffrage, Audit, Codir, Recrutement, etc.). Data is stored in the browser (`localStorage`) — no backend required for the demo.

## Local development

```bash
cd frontend
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200).

## Production build

```bash
cd frontend
npm ci
npm run build
```

Output: `frontend/dist/frontend/browser/`

## Deploy on Render.com

This repo includes a [Render Blueprint](https://render.com/docs/infrastructure-as-code) (`render.yaml`) configured as a **Static Site** with SPA routing.

### One-click (Blueprint)

1. Push this repo to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**.
3. Connect `Aedifio/naturea` (or your fork) and apply the blueprint.
4. Render builds from `frontend/`, publishes `dist/frontend/browser/` (relative to the root directory), and rewrites all routes to `index.html`.

### Manual static site

| Setting | Value |
|--------|--------|
| Root directory | `frontend` |
| Build command | `npm ci && npm run build` |
| Publish directory | `dist/frontend/browser` |
| Node version | `20` (env var `NODE_VERSION`) |

When **Root directory** is `frontend`, the publish path is relative to that folder — not the repo root. Do not prefix it with `frontend/`.

Add a **Rewrite** rule: `/*` → `/index.html` (Settings → Redirects/Rewrites).

### Troubleshooting: publish directory not found

If the build succeeds but deploy fails with:

```text
Publish directory frontend/dist/frontend/browser does not exist!
```

Update **Publish directory** in the Render Dashboard to `dist/frontend/browser` (not `frontend/dist/frontend/browser`), then trigger a manual deploy.

PR preview environments are enabled in the blueprint.

## Demo accounts

Authentication is client-side only. Use any of these accounts on the login page:

| Email | Password | Role |
|-------|----------|------|
| `animateur@maisons-naturea.fr` | `anim2026!` | Animateur |
| `directeur@maisons-naturea.fr` | `codir2026!` | Codir |
| `test.franchise@naturea.fr` | `test2026!` | Franchisé |
| `commercial.a@naturea.fr` | `comm2026!` | Commercial |
| `admin.a@naturea.fr` | `adm2026!` | Assistant·e admin |

See `frontend/src/app/core/models/permissions.model.ts` for the full seed user list.

## Environment variables

None required today. When Supabase or another backend is wired in, add build-time or runtime variables in the Render service settings.
