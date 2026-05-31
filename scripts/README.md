# scripts/

Local-development helpers. **None of this is for production.**

## `mock-jwt.mjs`

Mints RS256 JWTs signed by `colign-mock-private.pem`. The backend validates
against the paired public key at
`apps/colign-backend/src/main/resources/keys/colign-mock-public.pem` when
`wc.auth.mode=mock` (the default in `application-local.example.yml`).

```bash
# Mint an IC token (3600s expiry) and call the backend
T=$(node scripts/mock-jwt.mjs --email ada@st6.dev --role IC)
curl -H "Authorization: Bearer $T" http://localhost:8080/api/v1/plans/current

# Mint a manager token with a long expiry for the demo session
T=$(node scripts/mock-jwt.mjs --email manager@st6.dev --role MANAGER --ttl 14400)
```

Flags: `--email` (default `ada@st6.dev`), `--role` (`IC` | `MANAGER` | `ADMIN`,
default `IC`), `--ttl` (seconds, default `3600`), `--audience` (default
`https://api.colign.org`), `--issuer` (default `colign-mock`).

## `colign-mock-private.pem` / `colign-mock-public.pem`

The keypair used by the mock JWT flow. **Committed deliberately** so a
reviewer can clone the repo and immediately mint tokens to hit the backend.

> ⚠️ **DEMO-ONLY.** Never use this keypair for anything other than local
> development of this demo. To switch to real Auth0, set
> `wc.auth.mode=real` in `application-local.yml` and configure
> `wc.auth.real.issuer-uri` + `jwk-set-uri`.

## Generating fresh keys (if needed)

```bash
openssl genrsa -out scripts/colign-mock-private.pem 2048
openssl rsa -in scripts/colign-mock-private.pem -pubout -out apps/colign-backend/src/main/resources/keys/colign-mock-public.pem
```
