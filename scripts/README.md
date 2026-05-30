# scripts/

Local-development helpers. **None of this is for production.**

## `mock-jwt.mjs`

Mints RS256 JWTs signed by `wc-mock-private.pem`. The backend validates
against the paired public key at
`apps/wc-backend/src/main/resources/keys/wc-mock-public.pem` when
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
`https://api.wc.local`), `--issuer` (default `wc-mock`).

## `wc-mock-private.pem` / `wc-mock-public.pem`

The keypair used by the mock JWT flow. **Committed deliberately** so a
reviewer can clone the repo and immediately mint tokens to hit the backend.

> ⚠️ **DEMO-ONLY.** Never use this keypair for anything other than local
> development of this demo. To switch to real Auth0, set
> `wc.auth.mode=real` in `application-local.yml` and configure
> `wc.auth.real.issuer-uri` + `jwk-set-uri`.

## Generating fresh keys (if needed)

```bash
openssl genrsa -out scripts/wc-mock-private.pem 2048
openssl rsa -in scripts/wc-mock-private.pem -pubout -out apps/wc-backend/src/main/resources/keys/wc-mock-public.pem
```
