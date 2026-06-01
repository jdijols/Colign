# scripts/

Local-development helpers. **None of this is for production.**

## `mock-jwt.mjs`

Mints RS256 JWTs signed by `colign-mock-private.pem`. The backend validates
against the paired public key at
`apps/colign-backend/src/main/resources/keys/colign-mock-public.pem` when
`colign.auth.mode=mock` (the default in `application-local.example.yml`).

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

The keypair used by the mock JWT flow:

- **`apps/colign-backend/src/main/resources/keys/colign-mock-public.pem`** —
  the public key. **Committed.** Backends validate mock-mode JWTs against
  this when `colign.auth.mode=mock`.
- **`scripts/colign-mock-private.pem`** — the matching private key.
  **Gitignored.** You must generate this locally before first use of
  `mock-jwt.mjs` (see "Generating the keypair" below).

> ⚠️ **DEMO-ONLY.** Mock mode trusts any JWT signed by the paired private
> key. To switch to real Auth0, set `colign.auth.mode=real` in
> `application-local.yml` and configure `colign.auth.real.issuer-uri` +
> `jwk-set-uri`.

## Generating the keypair

Run from the repo root the first time you clone, and any time you want
to rotate locally:

```bash
openssl genrsa -out scripts/colign-mock-private.pem 2048
chmod 600 scripts/colign-mock-private.pem
openssl rsa -in scripts/colign-mock-private.pem -pubout \
    -out apps/colign-backend/src/main/resources/keys/colign-mock-public.pem
```

The first line writes the private key (gitignored). The third line
overwrites the committed public key with the matching public half — so
if you regenerate, **commit the new public key** so the rest of the
team and CI stay in sync. The two halves must always come from the
same `openssl genrsa` run; backends reject tokens signed by a private
key whose public half doesn't match what they have on classpath.

Sanity check that the pair matches:

```bash
diff <(openssl rsa -in scripts/colign-mock-private.pem -pubout 2>/dev/null) \
     apps/colign-backend/src/main/resources/keys/colign-mock-public.pem
```

No output = matched pair.
