# Render Deployment Setup

## Issue: Blank "Not Found" on Browser Refresh

**Cause:** Render dashboard service config (runtime, start command, etc.) does not match `render.yaml`.

## Solution: Sync Service Configuration

If the service was created **before** `render.yaml` was added, the dashboard settings override the Blueprint. You must manually update:

### Option 1: Re-sync from Blueprint (recommended)

1. In Render Dashboard → **naturea-portal service → Settings**
2. Scroll to **Build & Deploy** section
3. Click **Connect a repository** or **Update from Blueprint**
4. Select the repo, branch `main`, and confirm

This applies all settings from `render.yaml`:
- Runtime: **Node** (not Static)
- Start command: `node server.mjs`
- Build command: `npm ci && npm run build`
- Health check: `/health`

### Option 2: Manual Dashboard Configuration

In **Settings → Build & Deploy**, set exactly:

| Field | Value |
|-------|-------|
| **Runtime** | **Node** (dropdown) |
| **Node Version** | 20 |
| **Root Directory** | `frontend` |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `node server.mjs` |
| **Health Check Path** | `/health` (optional) |

Then scroll down to **Redirects/Rewrites**: **DELETE any old rules** left from the Static Site era.

### Option 3: Completely Recreate the Service

In Render Dashboard:
1. Delete the old **naturea-portal** service
2. Go to **Blueprints → GitHub Repositories → Connect Repository**
3. Select the naturea repo
4. It will auto-detect `render.yaml` and create a fresh **Node Web Service** with correct config

---

## How It Works After Setup

1. **Build** (`npm ci && npm run build`):
   - Runs `write-environment.mjs` to inject `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN`
   - Builds Angular app to `dist/frontend/browser/`
   - Copies `index.html` → `404.html`

2. **Start** (`node server.mjs`):
   - Listens on `0.0.0.0:PORT`
   - Serves `/` → `index.html` → Angular bootstrap
   - Deep routes like `/apps/chiffrage` → `index.html` (SPA fallback)
   - On refresh, browser requests `/apps/chiffrage` from server
   - Server returns `index.html` (status 200)
   - Angular router loads and restores session in guards
   - Router navigates to `/apps/chiffrage` within the SPA

3. **Health checks** (`GET /health` → `200 ok`):
   - Render uses this to detect if the service is alive

---

## Testing Locally

```bash
cd frontend
npm run build
npm run start:prod  # runs: node server.mjs

# In another terminal:
curl http://localhost:3000/apps/chiffrage
# Expected: 200 with <app-root> and main.*.js references
```

---

## Verify After Deployment

1. Open the app and login: https://naturea-portal.onrender.com/
2. Navigate to any app: `/apps/chiffrage`
3. **Refresh the page** (Cmd+R or F5)
4. Should stay on `/apps/chiffrage` with the app loaded

If you get a blank "Not Found" page, the service is still a Static Site or the start command is wrong. Check dashboard → Settings → Build & Deploy.

---

## Debugging

**Build logs show "build output missing"?**
- Check if `npm run build` is the full command (not missing `write-environment.mjs`)
- Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SENTRY_DSN` are set in Render env vars

**Service won't start (no "SPA server listening" in logs)?**
- Check if start command is `node server.mjs` (not `npm start` or something else)
- Check if build created `dist/frontend/browser/index.html`

**Requests return 404 on refresh?**
- Service is still a Static Site (check Runtime field in dashboard)
- Or old Static Site Redirects/Rewrites rules are active (delete them)

**Health checks fail?**
- If health check path is enabled, it must be `/health` and the server must respond with 200

---

## Files

- **`render.yaml`** — Blueprint defining the Node Web Service
- **`frontend/server.mjs`** — SPA server: serves files, falls back to index.html
- **`frontend/src/app/app.config.ts`** — Bootstrap: blocks until session restored (8s timeout)
- **`frontend/src/environments/environment.ts`** — Auto-generated from env vars (gitignored)
