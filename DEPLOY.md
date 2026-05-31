# Deploying Colign to production

Target topology (chosen 2026-05-31):

```
app.colign.org   →  Vercel project: pa-host       (MF host, user-facing)
<remote>.vercel.app → Vercel project: colign-frontend (MF remote, loaded by host)
api.colign.org   →  Fly.io app: colign-backend     (Spring Boot)  +  Fly Postgres
emails           →  Resend (colign.org verified, us-east-1)
auth             →  Auth0 tenant dev-xpbf6g232kcce8nc (shared dev+prod, prod URLs added)
```

Why this shape: the host calls `/api/v1/*` (relative). Vercel rewrites `/api/*`
to the Fly backend **server-side**, so the browser stays same-origin — no CORS,
and the `Authorization: Bearer` header passes straight through. The MF remote is
loaded cross-origin by the host, so it ships `Access-Control-Allow-Origin: *` on
its assets.

## Prerequisites

- Fly.io account + `flyctl` (installed). Backend + Postgres live here.
- Vercel account + `vercel` CLI (installed). Both frontends live here.
- Access to the Auth0 dashboard (tenant `dev-xpbf6g232kcce8nc`).
- Access to GoDaddy DNS for `colign.org`.
- `apps/colign-backend/.env.local` present (holds `RESEND_API_KEY`).

---

## Phase 1 — Backend → Fly.io (api.colign.org)

All commands run from `apps/colign-backend/`.

```bash
cd apps/colign-backend
fly auth login                      # opens browser — your account

# Create the app (name must be globally unique; doesn't affect the public
# hostname, which is api.colign.org via certs below).
fly apps create colign-backend      # if taken, pick colign-backend-<suffix> and update fly.toml `app`

# Provision Postgres in the same region.
fly postgres create --name colign-db --region iad
#   → prints the superuser password ONCE. Save it.

# Attach: creates an app-scoped DB + user and sets DATABASE_URL on the app.
fly postgres attach colign-db --app colign-backend
#   → prints  postgres://USER:PASS@HOST:5432/DB?sslmode=disable
#   Translate that into the vars the app actually reads:
fly secrets set \
  DB_URL="jdbc:postgresql://HOST:5432/DB?sslmode=disable" \
  DB_USER="USER" \
  DB_PASS="PASS" \
  --app colign-backend

# Resend key — straight from the gitignored .env.local, never echoed.
fly secrets set RESEND_API_KEY="$(grep '^RESEND_API_KEY' .env.local | cut -d= -f2-)" --app colign-backend

# Deploy (Fly builds the Dockerfile on a remote builder; local Docker optional).
fly deploy --app colign-backend

# Smoke the raw Fly hostname before DNS:
curl -s https://colign-backend.fly.dev/actuator/health   # → {"status":"UP"}

# Public hostname + TLS:
fly certs add api.colign.org --app colign-backend
#   → prints the CNAME target (usually colign-backend.fly.dev).
```

**GoDaddy (Phase 1 DNS):** add a **CNAME**, Name `api`, Value the cert target
(`colign-backend.fly.dev`). Then `fly certs show api.colign.org` until it's
issued (a few min). Re-smoke `https://api.colign.org/actuator/health`.

Non-secret backend config already lives in `fly.toml [env]` (auth mode, issuer,
JWKS, audience, CORS origin, app base-url, Resend FROM). Secrets set above:
`DB_URL`, `DB_USER`, `DB_PASS`, `RESEND_API_KEY`.

---

## Phase 2 — Frontends → Vercel

Deploy the **remote first** (the host needs its URL at build time).

### 2a. MF remote (colign-frontend)

From `apps/colign-frontend/`:

```bash
cd apps/colign-frontend
vercel login                         # browser — your account
vercel link                          # create/link a project (e.g. "colign-remote")
```

Set project env vars (Vercel dashboard → Settings → Environment Variables, or
`vercel env add`). Production scope:

| Var | Value |
|---|---|
| `PUBLIC_PATH` | `/` |
| `VITE_AUTH_MODE` | `real` |
| `VITE_AUTH0_AUDIENCE` | `https://api.colign.org` |

(The remote reads `VITE_AUTH_MODE`/audience for its `isReal` paths and token
calls. Domain/clientId are owned by the host, so they're optional here.)

```bash
vercel build --prod
vercel deploy --prebuilt --prod      # → note the deployment URL, e.g. https://colign-remote.vercel.app
```

The remote's `remoteEntry.js` is at `https://<that-url>/remoteEntry.js`.

### 2b. MF host (pa-host) → app.colign.org

From `apps/pa-host/`:

```bash
cd apps/pa-host
vercel link                          # project e.g. "colign-app"
```

Production env vars:

| Var | Value |
|---|---|
| `COLIGN_REMOTE_URL` | `https://<remote-url>/remoteEntry.js` (from 2a) |
| `VITE_AUTH_MODE` | `real` |
| `VITE_AUTH0_DOMAIN` | `dev-xpbf6g232kcce8nc.us.auth0.com` |
| `VITE_AUTH0_CLIENT_ID` | the SPA client id (`S2Knde…` — from Auth0) |
| `VITE_AUTH0_AUDIENCE` | `https://api.colign.org` |

```bash
vercel build --prod
vercel deploy --prebuilt --prod
vercel domains add app.colign.org    # or: project → Settings → Domains
```

**GoDaddy (Phase 2 DNS):** add the CNAME Vercel shows for `app` (typically
`cname.vercel-dns.com`). Wait for Vercel to verify + issue TLS.

`vercel.json` in each app already handles the rest: pa-host rewrites `/api/*` →
`https://api.colign.org` + SPA fallback; colign-frontend sends CORS headers on
its assets.

---

## Phase 3 — Auth0 production URLs

Auth0 dashboard → Applications → the SPA (`colign`, `S2Knde…`) → Settings. Add
`https://app.colign.org` to **all three** (comma-separated with existing
localhost entries):

- Allowed Callback URLs
- Allowed Logout URLs
- Allowed Web Origins

Save. (The localhost consent screen does not appear in prod behind the verified
`colign.org`.) No separate prod tenant for now — same tenant, prod URLs added.

---

## Phase 4 — Production smoke test

1. Open `https://app.colign.org` → Continue with Auth0 → real Google login.
2. Land on onboarding → create a team → routes to `/onboarding/invite`.
3. Invite a **real** email address you control, as REPORT.
4. Confirm the email arrives **from `onboarding@colign.org`** (check spam too).
5. Open the invite link in a different browser / account, sign in as that user,
   accept → lands in My Week with `teamId` + `managerId` set.
6. Back as the inviter, reload → the **Team** nav link appears (role derived to
   MANAGER). The roll-up shows the new report.

If every step passes, prod is live.

---

## Environment variable reference

**Fly backend** — `fly.toml [env]` (non-secret): `SPRING_PROFILES_ACTIVE=prod`,
`COLIGN_AUTH_MODE=real`, `COLIGN_AUTH_AUDIENCE`, `COLIGN_AUTH0_ISSUER`,
`COLIGN_AUTH0_JWKS`, `COLIGN_CORS_ORIGINS=https://app.colign.org`,
`COLIGN_APP_BASE_URL=https://app.colign.org/weekly-commit`, `RESEND_FROM`,
`PORT`. Secrets: `DB_URL`, `DB_USER`, `DB_PASS`, `RESEND_API_KEY`.

**Vercel remote (colign-frontend):** `PUBLIC_PATH=/`, `VITE_AUTH_MODE=real`,
`VITE_AUTH0_AUDIENCE`.

**Vercel host (pa-host):** `COLIGN_REMOTE_URL`, `VITE_AUTH_MODE=real`,
`VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`.

---

## Rollback / teardown

- Backend: `fly deploy` is versioned — `fly releases` + `fly deploy --image <prev>`
  or `fly apps restart`. Full teardown: `fly apps destroy colign-backend` +
  `fly postgres ... destroy`.
- Frontend: Vercel keeps every deployment — promote a previous one in the
  dashboard, or `vercel rollback`.
- DNS: removing the GoDaddy CNAMEs reverts the public hostnames.

## Cost (rough, monthly)

- Fly: 1× shared-cpu-1x 1gb (~$5) + Postgres (~$3–5 single-node dev) ≈ **$8–10**.
- Vercel: two projects on Hobby = **$0** for personal/non-commercial.
- Resend: free tier (3k emails/mo) = **$0**.

## Known first-deploy iteration points

- **MF host↔remote wiring** is the fiddliest part. If the app shell loads but
  the WC remote 404s its chunks, check: remote built with `PUBLIC_PATH=/`,
  `COLIGN_REMOTE_URL` points at the exact `remoteEntry.js`, and the remote
  responds with `Access-Control-Allow-Origin: *`.
- **Vercel monorepo root**: set each project's Root Directory to its app folder
  (`apps/pa-host`, `apps/colign-frontend`) so the right `package.json` + build
  runs.
- If `/api` calls 404 in prod, confirm the pa-host rewrite deployed (Vercel →
  project → Settings → check `vercel.json` was picked up).
