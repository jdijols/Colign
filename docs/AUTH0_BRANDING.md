# Branding the Auth0 Universal Login page for colign

This walks you through making your Auth0 tenant's `/u/login` page (the one users land on after clicking "Continue with Auth0") look like a deliberate continuation of colign — same colors, same typography, same logomark. The redirect-blip becomes a brand moment instead of a context switch.

Free Auth0 plan covers everything in this doc. The "New Universal Login Experience" must be enabled (it usually is for tenants created in 2024+; double-check below).

## Prerequisites

- Logged in to the Auth0 dashboard for the `dev-xpbf6g232kcce8nc` tenant.
- A public URL where your logo SVG is hosted. (For the demo, use `https://colign.org/favicon.svg` once that lands. As a quick stand-in, GitHub raw URLs or `data:` URIs work: `https://raw.githubusercontent.com/{your-username}/{repo}/main/apps/wc-frontend/public/favicon.svg`.)

## 1. Switch to the New Universal Login Experience

**Branding → Universal Login → Settings** (top of the page).

Make sure **Experience** is set to **"New"** (not Classic / Lock.js). If you only see Classic, the tenant is older — toggle to New.

## 2. Tenant-level logo + colors

**Branding → Settings**:

| Field | Value | Notes |
|-|-|-|
| Logo URL | `https://YOUR_PUBLIC_URL/colign-mark.svg` | The Colign mark (3 horizontal bars). Auth0 displays this above the login form. PNG also works. Square aspect ratio, ≥150×150px. |
| Primary Color | `#0a0a0a` | Tailwind `neutral-950`. Matches the primary button in our app. |
| Page Background | `#ffffff` | Tailwind `white`. Match the light-mode app background. |
| Favicon URL | (same as Logo URL) | For the Auth0 page's browser-tab favicon. |

Save.

## 3. Universal Login customization

**Branding → Universal Login → Customizations** tab.

### Page background

Section: **Page Background**.

- **Background type:** Solid color
- **Color:** `#ffffff` (matches our light-mode canvas)

If your audience is dark-mode-first and you want the Auth0 page to also feel dark, use `#0a0a0a` and adjust contrast on the form widgets — but light-mode-first is more conventional and works in any lighting.

### Widget (the login card)

Section: **Widget**.

- **Logo position:** Center
- **Header text:** *(leave blank — the headline above the form already says "Welcome")*
- **Button text:** Default Auth0 copy is fine. The button color is driven by Primary Color from §2.
- **Border radius:** `8` (matches our `rounded-lg`)
- **Border weight:** `1px`

### Font

Section: **Font**.

- **Font URL:** `https://rsms.me/inter/inter.css` (CDN hosting of Inter — matches our app's typography)
- **Reference text size:** 16
- **Title size:** 1.25
- **Subtitle size:** 0.9
- **Body text size:** 0.875

Save.

## 4. Optional: branded copy

**Branding → Universal Login → Customizations → "Welcome" header**:

Default: "Welcome — Log in to {tenant} to continue to {client}"

Replace with: **"Sign in to colign — open source weekly planning"**

This makes the page read like a colign page, not a generic Auth0 page.

## 5. Test it

1. Refresh `http://localhost:5174/login`
2. Click **Continue with Auth0**
3. You should land on your branded `dev-xpbf6g232kcce8nc.us.auth0.com/u/login` — white background, Colign logomark above the form, neutral-950 "Continue" button, Inter typography
4. Sign up with `manager@st6.dev` (or any email)
5. Bounce back to `http://localhost:5174/` — you're in

## Troubleshooting

- **Logo not showing**: the Logo URL must be publicly reachable from a fresh browser without auth (Auth0 fetches it from your user's browser, not from Auth0 servers). Test by opening the URL in an incognito window.
- **Colors don't apply**: hard-refresh the Auth0 login page (Cmd+Shift+R). Auth0 also caches their CDN aggressively — wait 30s if you just saved.
- **Font fallback**: if `rsms.me` is blocked on the user's network, Inter falls back to the system sans-serif. Looks fine either way.

## Verifying with a screenshot

After saving, run from the repo root:

```bash
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto http://localhost:5174/login
$B click @e1   # or whichever ref maps to "Continue with Auth0"
sleep 3
$B screenshot /tmp/auth0-branded.png
```

The screenshot should show the Auth0 login page with the Colign mark + light background + neutral-950 button — visually continuous with our login card.
