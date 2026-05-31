# Branding the Auth0 Universal Login page for colign

The redirect-blip from `Get started` → Auth0 should feel like one continuous colign experience, not "you've been handed off to a vendor." This walks you through every setting that controls what users see on `/u/login` — the page header, the form widget, the button colors, the typography, and the dev-tenant warning chrome.

**Everything in this doc runs on Auth0's Free plan.** New Universal Login Experience must be enabled (default for tenants created 2024+; toggle in Branding → Universal Login → Settings if you see Classic / Lock.js).

---

## The three things to fix on a fresh tenant

When you flip `VITE_AUTH_MODE=real` and click through the live flow for the first time, three things will look wrong out of the box:

1. **The headline says `"Log in to dev-xpbf6g232kcce8nc to continue to WC SPA."`** — that's two placeholders Auth0 is filling in: the tenant subdomain and the application name. Both are renameable. (§4 below.)
2. **The Continue button is Auth0's stock blue.** — set the Primary Color and it inherits across all widgets. (§3 below.)
3. **A red warning triangle sits in the top-right.** — that's Auth0's "this is a development tenant" indicator. Only fix is to migrate to a Production tenant (still free up to 7,000 MAU). (§6 below.)

Each is addressed in its own section below.

---

## Prerequisites

- Logged in to the Auth0 dashboard at `https://manage.auth0.com/dashboard/us/dev-xpbf6g232kcce8nc/`.
- A public URL where your logo SVG is hosted. The ColignMark SVG lives at `apps/colign-frontend/src/components/Brand.tsx` — extract the `<svg>` and host it. Options:
  - `https://colign.org/colign-mark.svg` (once the marketing site ships at colign.org)
  - GitHub raw URL: `https://raw.githubusercontent.com/jdijols/Colign/main/apps/colign-frontend/public/colign-mark.svg`
  - `data:` URI inline (works for small SVGs)

---

## 1. Switch to the New Universal Login Experience

**Branding → Universal Login → Settings**.

Confirm **Experience** is **"New"** (not Classic / Lock.js). Everything below assumes New.

---

## 2. Tenant-level logo + colors

**Branding → Settings**:

| Field | Value | Notes |
|-|-|-|
| Logo URL | `https://YOUR_PUBLIC_URL/colign-mark.svg` | The ColignMark (3 descending horizontal bars). Square aspect ratio, ≥150×150px recommended. SVG preferred, PNG works. |
| Primary Color | `#0a0a0a` | Tailwind `neutral-950`. Drives the Continue button background, link colors, and form-focus outlines. |
| Page Background | `#ffffff` | Tailwind `white`. Matches the colign light-mode canvas (`--bg`). |
| Favicon URL | (same as Logo URL) | Sets the Auth0 page's browser-tab favicon. |

**Save.**

---

## 3. Universal Login customization (colors, widget, font)

**Branding → Universal Login → Customizations** tab.

### Page Background

- **Background type:** Solid color
- **Color:** `#ffffff`

(For a dark-mode-first Auth0 page, use `#0a0a0a` and bump the widget's border contrast — most users tolerate light-mode Auth0 regardless of their app preference. Light-mode default is the conventional choice.)

### Widget (the login card)

- **Logo position:** Center
- **Header text:** *leave blank* — Auth0 will use its default "Welcome" string, which §4 customizes
- **Border radius:** `12` (matches our `rounded-xl` design-system token)
- **Border weight:** `1`

### Font

We use **Geist** in the app, so the Auth0 page should too:

- **Font URL:** `https://fonts.googleapis.com/css2?family=Geist:wght@400..700&display=swap`
- **Reference text size:** `16` (px)
- **Title size:** `1.25` (relative)
- **Subtitle size:** `0.9`
- **Body text size:** `0.875`
- **Buttons text size:** `0.95`
- **Input labels size:** `0.85`

**Save.**

---

## 4. Fix the placeholder copy ("Log in to dev-xpbf6g232kcce8nc to continue to WC SPA")

That sentence has two problems:

- `dev-xpbf6g232kcce8nc` = your tenant subdomain. Replace via the tenant's **Display Name**.
- `WC SPA` = the Auth0 Application's **Name**. Rename it.

### 4a. Rename the tenant (the "Log in to X" part)

**Settings → General → Settings**:

| Field | Value |
|-|-|
| Friendly Name | `colign` |
| Support Email | your email (shown on error pages) |
| Support URL | `https://colign.org` |

**Save.**

This changes `Log in to dev-xpbf6g232kcce8nc` → `Log in to colign`.

### 4b. Rename the application (the "continue to Y" part)

**Applications → Applications → WC SPA → Settings → Basic Information**:

| Field | Value |
|-|-|
| Name | `colign` |
| Description | `Open source weekly planning where every commit links to a strategic outcome.` |
| Application Logo | (same URL as §2) |

**Save.**

This changes `to continue to WC SPA.` → `to continue to colign.`

After 4a + 4b, the default text reads `"Log in to colign to continue to colign."` — which is now redundant but at least branded. To fully clean this up, do 4c.

### 4c. (Recommended) Replace the description entirely with Custom Text

**Branding → Universal Login → Customizations → "Customize Text" / Advanced**.

Or via Management API: `PUT /api/v2/prompts/login/custom-text/en`

For the **Login** prompt, **Login** screen, set:

| Key | Value |
|-|-|
| `title` | `Sign in` |
| `description` | `Pick up where you left off, or start a new week.` |
| `buttonText` | `Continue` *(default)* |
| `forgotPasswordText` | `Forgot password?` |
| `signupActionLinkText` | `Create an account` |
| `signupActionText` | `New to colign?` |
| `federatedConnectionButtonText` | `Continue with ${connectionName}` |

For the **Signup** prompt, **Signup** screen, set:

| Key | Value |
|-|-|
| `title` | `Create your colign account` |
| `description` | `One account, every week of planning.` |
| `buttonText` | `Sign up` |
| `loginActionLinkText` | `Sign in` |
| `loginActionText` | `Already have a colign account?` |

**Save.** This replaces the entire `Welcome / Log in to {tenant} to continue to {client}` pattern with your own copy. The placeholders are no longer interpolated.

---

## 5. Button style — matching the colign design system

The Continue button picks up Primary Color from §2 (`#0a0a0a`). That gets you 80% of the way to design-system parity. The remaining gap:

- **Border radius**: set in §3 Widget (12px = our `rounded-xl`)
- **Font weight**: comes from the Geist URL in §3 — Auth0 will use weight 500 for the button label by default, which matches our `Button` primary

If you want pixel-exact parity with the in-app Get started button (rounded-full pill, 20px 28px padding, 16px text), you'd need a **Custom Page Template** which requires editing HTML via the Management API or paid Auth0 features. For most cases, the Primary Color + border-radius combo reads as visually continuous and is plenty.

---

## 6. The red warning triangle (dev tenant indicator)

That floating red triangle at top-right is **Auth0's "Development tenant" badge**. It appears on every page of every dev tenant and **cannot be removed in dev**. It's a deliberate signal to developers that "this is not production — don't trust this UI for real auth flows."

**Two options:**

### Option A — keep dev tenant for now, accept the badge

Fine for local dev, demos to internal stakeholders, and the ST6 submission walkthrough video (you can crop it out in OBS / mention it in narration). Don't ship to real customers like this.

### Option B — migrate to a Production tenant (recommended before public launch)

1. **Settings → Tenant Settings → Subscription → Upgrade** — wait, you're already on Free. The button you want is in the top-right tenant switcher: **Create Tenant**.
2. Create a new tenant with **Environment Tag: Production** and Name: `colign-prod` (or whatever) → Region: same as dev for latency.
3. Production tenants still cost nothing on Free plan (7,000 MAU).
4. Re-run §1-§5 in the new tenant (or use the **Tenant Settings → Import / Export** feature to clone configuration).
5. Update `apps/pa-host/.env.local` and `apps/colign-frontend/.env.local`:

   ```bash
   VITE_AUTH0_DOMAIN=colign-prod.us.auth0.com    # or whatever the new tenant subdomain is
   VITE_AUTH0_CLIENT_ID=<new SPA client id>
   # VITE_AUTH0_AUDIENCE stays the same: https://api.colign.org
   ```

6. Update the backend env (`WC_AUTH0_ISSUER`, `WC_AUTH0_JWKS`) similarly — the JWKS URL becomes `https://colign-prod.us.auth0.com/.well-known/jwks.json`.
7. Restart all three services. The red triangle is gone.

The dev tenant stays around — keep it for mock auth experiments and CI without burning prod MAU.

---

## 7. Test it

1. Hard-refresh the landing: `http://localhost:4173/`
2. Click **Get started**
3. You should land on your branded Auth0 page:
   - White background
   - ColignMark centered above the form
   - "Sign in" + "Pick up where you left off..." (from §4c)
   - `#0a0a0a` Continue button with `rounded-xl` corners
   - Geist typography throughout
   - If on the prod tenant, no red triangle in the top-right
4. Sign up with any email (or `manager@st6.dev` to seed the manager role per `AUTH0_SETUP.md`)
5. Auth0 bounces you back to `http://localhost:4173/` → your `useEffect` in HostHome.tsx then forwards you to `/weekly-commit`

---

## Troubleshooting

- **Logo doesn't show**: Auth0 fetches the URL from the user's browser, not from Auth0's servers. Test by opening the Logo URL in an incognito window. Common gotcha: GitHub raw URLs serve with `Content-Type: text/plain` for SVG — use a real CDN or your own domain.
- **Colors don't apply**: hard-refresh the `/u/login` page (Cmd+Shift+R). Auth0's CDN caches aggressively — wait 30-60s after saving.
- **Font fallback**: Geist loads from Google Fonts; if blocked on the user's network, falls back to system sans (matches our app's fallback chain). Looks fine either way.
- **Custom Text doesn't apply**: confirm you're editing under the **Login** prompt → **Login** screen (not the **Universal Login** prompt). Auth0 has multiple prompt hierarchies for legacy reasons.
- **"to continue to colign to continue to colign"** (duplicated): if your text still has `${clientName}` in it after §4c, you didn't replace the description — you only renamed the app. Re-do §4c with the literal text (no `${}` placeholders).

---

## Automating it (optional)

All of §2-§5 can be set via the Auth0 Management API. Useful if you maintain multiple tenants (dev + staging + prod) and want one config source of truth.

Sketch — would live at `scripts/auth0-apply-branding.sh`:

```bash
TENANT="dev-xpbf6g232kcce8nc"
M2M_TOKEN="$(your token from Auth0 Mgmt API)"

# Tenant logo + colors
curl -X PATCH "https://${TENANT}.us.auth0.com/api/v2/branding" \
  -H "Authorization: Bearer ${M2M_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "logo_url": "https://colign.org/colign-mark.svg",
    "colors": { "primary": "#0a0a0a", "page_background": "#ffffff" },
    "font": { "url": "https://fonts.googleapis.com/css2?family=Geist:wght@400..700&display=swap" }
  }'

# Custom prompt text
curl -X PUT "https://${TENANT}.us.auth0.com/api/v2/prompts/login/custom-text/en" \
  -H "Authorization: Bearer ${M2M_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "login": {
      "title": "Sign in",
      "description": "Pick up where you left off, or start a new week."
    }
  }'
```

Ask Claude to flesh this out when you're ready — it needs a real M2M token, which requires creating an Auth0 Machine-to-Machine application authorized for the Management API (5-minute dashboard task).
