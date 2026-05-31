#!/usr/bin/env node
// =====================================================================
// scripts/mock-jwt.mjs — mint demo JWTs for local development
//
// DEMO-ONLY. Pairs with the public key at
//   apps/wc-backend/src/main/resources/keys/colign-mock-public.pem
// The private key in scripts/colign-mock-private.pem is committed for demo
// purposes ONLY. Never reuse it in any non-demo environment.
//
// Usage:
//   node scripts/mock-jwt.mjs --email ada@st6.dev --role IC
//   node scripts/mock-jwt.mjs --email jasondijols@gmail.com --role MANAGER --ttl 7200
//
// Pipe into curl:
//   T=$(node scripts/mock-jwt.mjs --email ada@st6.dev --role IC)
//   curl -H "Authorization: Bearer $T" http://localhost:8080/api/v1/plans/current
// =====================================================================

import { readFileSync } from "node:fs";
import { createPrivateKey, createSign } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY_PEM = readFileSync(join(__dirname, "colign-mock-private.pem"), "utf8");

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, _, i, arr) => {
    if (arr[i].startsWith("--") && i + 1 < arr.length) acc.push([arr[i].slice(2), arr[i + 1]]);
    return acc;
  }, [])
);

const email = args.email ?? "ada@st6.dev";
const role = (args.role ?? "IC").toUpperCase();
const ttlSec = Number(args.ttl ?? 3600);
const audience = args.audience ?? "https://api.colign.org";
const issuer = args.issuer ?? "colign-mock";

const now = Math.floor(Date.now() / 1000);
const header = { alg: "RS256", typ: "JWT", kid: "colign-mock-key-1" };
const payload = {
  iss: issuer,
  sub: `mock|${email}`,
  aud: [audience],
  iat: now,
  nbf: now,
  exp: now + ttlSec,
  email,
  "https://colign.org/roles": [role],
  scope: "read:plans write:plans read:commits write:commits read:reconciliations write:reconciliations",
};

function b64url(input) {
  return Buffer.from(typeof input === "string" ? input : JSON.stringify(input))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

const signingInput = `${b64url(header)}.${b64url(payload)}`;
const key = createPrivateKey(PRIVATE_KEY_PEM);
const signer = createSign("RSA-SHA256");
signer.update(signingInput);
signer.end();
const signature = signer
  .sign(key)
  .toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

process.stdout.write(`${signingInput}.${signature}\n`);
