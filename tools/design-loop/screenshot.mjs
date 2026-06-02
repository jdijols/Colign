#!/usr/bin/env node
// =====================================================================
// tools/design-loop/screenshot.mjs
//
// CLI helper for the Colign design-loop. Takes a full-page screenshot
// of a URL at a given viewport, with optional mock-auth injection.
//
// CLI:
//   node tools/design-loop/screenshot.mjs \
//     --url http://localhost:4173/dashboard \
//     --width 1440 --height 900 \
//     --out tmp/design-loop/dashboard/cycle-1/desktop.png \
//     --persona ada@st6.dev --role MANAGER
//
// What it does:
//   1. Mints a mock JWT via the existing scripts/mock-jwt.mjs.
//   2. Injects { colign_jwt, colign_email, colign_role } into
//      localStorage BEFORE any page script runs (init script).
//   3. Navigates with networkidle, waits a beat for animations.
//   4. Saves a full-page PNG to --out (creating dirs as needed).
//
// For non-localhost URLs (e.g., example.com smoke tests), the mint
// step is skipped if you omit --persona.
//
// Exit codes:
//   0 — screenshot saved
//   2 — navigation failed (timeout / network error)
//   3 — bad args
// =====================================================================

import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--") && i + 1 < argv.length) {
      out[a.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.url || !args.out) {
  console.error("usage: screenshot.mjs --url URL --width N --height N --out PATH [--persona EMAIL --role IC|MANAGER|ADMIN]");
  process.exit(3);
}

const url = args.url;
const width = parseInt(args.width || "1440", 10);
const height = parseInt(args.height || "900", 10);
const out = resolve(args.out);
const persona = args.persona || null;
const role = args.role || "IC";

mkdirSync(dirname(out), { recursive: true });

let jwt = null;
if (persona) {
  const scriptPath = resolve(import.meta.dirname, "../../scripts/mock-jwt.mjs");
  jwt = execSync(`node ${scriptPath} --email ${persona} --role ${role}`, {
    encoding: "utf8",
  }).trim();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width, height } });

if (jwt) {
  await context.addInitScript(
    (d) => {
      localStorage.setItem("colign_jwt", d.jwt);
      localStorage.setItem("colign_email", d.email);
      localStorage.setItem("colign_role", d.role);
    },
    { jwt, email: persona, role }
  );
}

const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
} catch (e) {
  console.error(`Navigation failed: ${e.message}`);
  await browser.close();
  process.exit(2);
}

// Let any client-side animations settle.
await page.waitForTimeout(500);

await page.screenshot({ path: out, fullPage: true });
await browser.close();

const size = statSync(out).size;
console.log(`Screenshot saved: ${out} (${size} bytes)`);
