/** @type {import('tailwindcss').Config} */
import flowbite from "flowbite/plugin";
import forms from "@tailwindcss/forms";

export default {
  // Class-strategy dark mode so the ThemeToggle's `.dark` on <html> drives the
  // entire app — overrides the default media-query behavior. See src/lib/theme.ts.
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    // flowbite-react is yarn-workspace-hoisted to the repo-root node_modules,
    // and ships at dist/esm (not lib/esm) in the v0.10 line. Without these
    // paths Tailwind never sees the utility classes Flowbite components use
    // internally → buttons render unstyled. Both paths kept so this still
    // works if a future yarn install de-hoists.
    "../../node_modules/flowbite-react/dist/esm/**/*.{js,mjs}",
    "./node_modules/flowbite-react/dist/esm/**/*.{js,mjs}",
  ],
  // Specificity scoping for when this remote is consumed by the PA host.
  // Tailwind utility prefix would break Flowbite-react's internal classes,
  // so we rely on the #colign-root id-scope instead.
  important: "#colign-root",
  theme: {
    extend: {
      colors: {
        // ── Legacy accent (kept; do NOT remove — exported for backward compat
        // with code that still references colignAccent.*). DESIGN.md v0.1 is
        // monochrome-by-brand; no new code should reach for these blues.
        colignAccent: {
          50: "#eef6ff",
          100: "#d8eaff",
          200: "#b8d8ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
        // ── Monochrome surface scale (DESIGN.md §4). Warm-neutral, paper-feel
        // canvas. e0 = canvas, e1 = surface, e2 = surface-tint for grouped
        // content (e.g. Outcome blocks in the cascade).
        canvas: "#f8f8f7",
        surface: {
          DEFAULT: "#ffffff",
          tint: "#f4f4f3",
        },
        hairline: {
          DEFAULT: "#e5e5e5",
          strong: "#d4d4d4",
        },
        // ── Foreground scale. `fg` is primary text; soft/mute/faint descend
        // by ~one step each. Avoids inventing colors at call-sites.
        fg: {
          DEFAULT: "#171717",
          soft: "#525252",
          mute: "#737373",
          faint: "#a3a3a3",
        },
        // ── Semantic-only color (DESIGN.md §4). Tuned away from Tailwind
        // defaults — quieter, less candy. Use ONLY where meaning attaches:
        // alignment tiers, plan state, commit status, destructive confirms.
        success: "#1a9659",
        warning: "#c4831d",
        destructive: "#c8334a",
      },
      fontFamily: {
        // Cabinet Grotesk added at the head of the display stack (DESIGN.md
        // §3). Falls through to Geist when unloaded, so no FOUT-shaped jank.
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: [
          "Cabinet Grotesk",
          "Geist",
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Existing fluid floor — DO NOT touch (responsive contract depends on it).
        "fluid-sm": "clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)",
        "fluid-base": "clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)",
        "fluid-lg": "clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)",
        "fluid-xl": "clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)",
        "fluid-2xl": "clamp(1.5rem, 1.36rem + 0.71vw, 2rem)",
        "fluid-3xl": "clamp(1.875rem, 1.55rem + 1.61vw, 3rem)",
        // ── DESIGN.md §3 type ramp additions. Eyebrow + display tier.
        eyebrow: ["0.6875rem", { letterSpacing: "0.12em", lineHeight: "1" }],
        "display-sm": "clamp(2rem, 1.5rem + 2vw, 2.75rem)",
        display: "clamp(2.75rem, 1.8rem + 4vw, 4.5rem)",
        "display-lg": "clamp(3.75rem, 2.5rem + 5vw, 6rem)",
      },
      spacing: {
        // Existing fluid section break — DO NOT touch.
        "section-fluid": "clamp(1.5rem, 1.0rem + 2.5vw, 4rem)",
        // ── DESIGN.md §5 spacing scale (4px base). Aliased onto Tailwind's
        // existing scale rather than overriding it — `gap-md` reads as the
        // 16px "within-card" unit; `mt-pillar` reads as the major section
        // break. Tailwind's 1/2/3/4… numeric scale still works untouched.
        "2xs": "0.25rem", // 4px
        xs: "0.5rem", // 8px
        sm: "0.75rem", // 12px
        md: "1rem", // 16px
        lg: "1.5rem", // 24px
        xl: "2rem", // 32px
        "2xl": "3rem", // 48px
        "3xl": "4rem", // 64px
        pillar: "clamp(3rem, 1.5rem + 4vw, 6rem)", // major section break
      },
      borderRadius: {
        // DESIGN.md §8 radius scale. Tailwind already ships `sm/md/lg/xl/full`
        // — these `r-*` aliases give us doc-traceable token names without
        // colliding with the default scale.
        "r-sm": "4px",
        "r-md": "6px",
        "r-lg": "8px",
        "r-xl": "12px",
        "r-pill": "9999px",
      },
      boxShadow: {
        // DESIGN.md §6 depth system. The ONLY allowed shadow is e3 (popovers,
        // drawers, modals). Cards rely on `border border-hairline` instead.
        // We deliberately do NOT expose `e0/e1/e2` shadows — that's the point.
        e3: "0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.04)",
      },
      transitionTimingFunction: {
        // DESIGN.md §7 — expo-out, single easing for everything.
        ease: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        // DESIGN.md §7 motion tokens.
        micro: "120ms",
        state: "240ms",
        layout: "400ms",
      },
    },
  },
  plugins: [flowbite, forms],
};
