# Auth0 setup (switching to real-tenant mode)

The backend ships with `wc.auth.mode=mock` by default — it validates RS256
JWTs signed by `scripts/colign-mock-private.pem`. This document walks through
the one-time tenant configuration to flip into `wc.auth.mode=real`, which
validates JWTs against a live Auth0 tenant + JWKS.

The dual-mode `SecurityConfig` reads the same audience, claims, and roles
in both modes — only the verification key source changes.

## Prerequisites

- An Auth0 tenant (the Free tier is sufficient for the demo — 7,000 MAU).
- 10 minutes in the Auth0 dashboard.

## Steps

### 1. Create the API (Resource Server)

Auth0 dashboard → **APIs** → **+ Create API**.

| Field | Value |
| --- | --- |
| Name | `Weekly Commit API` |
| Identifier (audience) | `https://api.colign.org` — must exactly match `wc.auth.audience` in `application-local.yml` |
| JSON Web Token (JWT) Profile | `RS256` |
| Signing Algorithm | `RS256` |

Inside the API, **Settings → Allow Skipping User Consent**: ON (demo only). Save.

### 2. Add the namespaced roles claim

Auth0 → **Actions → Library → Build Custom**. Name: `Add WC roles to access token`. Trigger: `Login / Post Login`. Code:

```js
exports.onExecutePostLogin = async (event, api) => {
  const ns = 'https://wc/';
  const roles = (event.authorization?.roles ?? []).map(r => r.toUpperCase());
  api.accessToken.setCustomClaim(`${ns}roles`, roles);
};
```

Deploy. Then **Actions → Flows → Login**, drag the action into the flow, save.

### 3. Create roles + assign

Auth0 → **User Management → Roles**: create `IC`, `MANAGER`, `ADMIN`. Auth0 → **Users**: create or pick a user, assign one of the three roles.

### 4. Create the SPA Application (for the frontend)

Auth0 → **Applications → + Create Application**, type "Single Page Web App".

| Field | Value |
| --- | --- |
| Allowed Callback URLs | `http://localhost:5173, http://localhost:5174` |
| Allowed Logout URLs | `http://localhost:5173, http://localhost:5174` |
| Allowed Web Origins | `http://localhost:5173, http://localhost:5174` |

Save. Note the **Domain** and **Client ID** for the frontend (`apps/colign-frontend/.env.local`).

### 5. Flip the backend into real mode

Copy `apps/colign-backend/src/main/resources/application-local.example.yml`
to `application-local.yml` and edit:

```yaml
wc:
  auth:
    mode: real
    audience: https://api.colign.org
    real:
      issuer-uri: https://YOUR_TENANT.us.auth0.com/
      jwk-set-uri: https://YOUR_TENANT.us.auth0.com/.well-known/jwks.json
```

Restart: `cd apps/colign-backend && mvn spring-boot:run`.

### 6. Mint a test token + verify

Use Auth0's "Test" tab on the API to grab an access token, or use the
client-credentials flow against your M2M Application:

```bash
TOKEN=$(curl -sX POST https://YOUR_TENANT.us.auth0.com/oauth/token \
  -H 'content-type: application/json' \
  -d '{
    "client_id":"YOUR_M2M_CLIENT_ID",
    "client_secret":"YOUR_M2M_SECRET",
    "audience":"https://api.colign.org",
    "grant_type":"client_credentials"
  }' | jq -r .access_token)

curl -i -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/plans/current
```

A successful 200 (or 404 with a JSON body, depending on data) confirms the
JWT was validated by Spring against the real JWKS.

## Falling back to mock mode

If anything goes wrong, flip `wc.auth.mode: mock` and restart. The mock
keypair always works and lets the demo continue.

## Risk timebox

If real-tenant setup takes more than 2 hours, **stop and fall back to
mock**. This is logged in `PLAN.md` §12 and in `docs/AI-USAGE-LOG.md`.
