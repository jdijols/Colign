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
        colignAccent: {
          50: "#eef6ff",
          100: "#d8eaff",
          200: "#b8d8ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["Geist", "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        "fluid-sm": "clamp(0.8125rem, 0.78rem + 0.16vw, 0.875rem)",
        "fluid-base": "clamp(0.9375rem, 0.91rem + 0.16vw, 1rem)",
        "fluid-lg": "clamp(1.0625rem, 1.02rem + 0.22vw, 1.125rem)",
        "fluid-xl": "clamp(1.25rem, 1.18rem + 0.36vw, 1.5rem)",
        "fluid-2xl": "clamp(1.5rem, 1.36rem + 0.71vw, 2rem)",
        "fluid-3xl": "clamp(1.875rem, 1.55rem + 1.61vw, 3rem)",
      },
      spacing: {
        "section-fluid": "clamp(1.5rem, 1.0rem + 2.5vw, 4rem)",
      },
    },
  },
  plugins: [flowbite, forms],
};
