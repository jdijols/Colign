import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: [
      "dist",
      "cypress",
      "cypress-results",
      "node_modules",
      "@mf-types",
      "src/colign-compiled.css",
      "**/*.config.{js,cjs}",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2024 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    settings: { react: { version: "18" } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      // TS strict + the `unknown` type cover what no-explicit-any aims at;
      // we keep it as a warning so escape hatches stay visible without
      // blocking every test fixture cast.
      "@typescript-eslint/no-explicit-any": "warn",
      // Real signal but an ergonomic judgment call: autoFocus on the first
      // input of a single-purpose form (invite, onboarding) is generally
      // accepted. Keep as warn so use is visible without blocking.
      "jsx-a11y/no-autofocus": "warn",
    },
  },

  {
    files: ["src/**/*.test.{ts,tsx}", "src/test/**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node, ...globals.vitest },
    },
    rules: {
      // Test files commonly destructure unused render results / fixtures.
      "@typescript-eslint/no-unused-vars": "off",
      // Components in this app take a `role` prop that names a Colign user
      // role ("IC" | "MANAGER" | "ADMIN") — unrelated to ARIA. jsx-a11y
      // can't tell them apart in test fixtures.
      "jsx-a11y/aria-role": "off",
    },
  },

  prettier,
];
