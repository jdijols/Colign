/** @type {import('tailwindcss').Config} */
import flowbite from "flowbite/plugin";
import forms from "@tailwindcss/forms";

export default {
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
  // so we rely on the #wc-root id-scope instead.
  important: "#wc-root",
  theme: {
    extend: {
      colors: {
        wcAccent: {
          50: "#eef6ff",
          100: "#d8eaff",
          200: "#b8d8ff",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [flowbite, forms],
};
