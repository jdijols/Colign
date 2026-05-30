# Vite 5 Module Federation — WC Remote ↔ PA Host

> **Sourcing note**: Live web access (WebSearch / WebFetch / ctx7) was denied in
> the subagent environment. The brief below reflects the late-2025/early-2026
> ecosystem state per Claude's training data (cutoff Jan 2026). Pin and verify
> actual package versions against npm before installing.

## Plugin recommendation

Two plugins compete for Vite-based Module Federation in late 2025. `@originjs/vite-plugin-federation` was the de-facto choice from 2021–2023: simple, Rollup-friendly, and supported Vite 2–5. However, it is community-maintained, lags Vite/Rspack feature parity, and its issue tracker shows long-standing gaps around runtime plugins, dynamic remotes, eager loading of singletons, and SSR. As of v1.3.x (mid-2024, still current in late 2025), it has not adopted the official Module Federation 2.0 runtime, which means it cannot interoperate cleanly with Webpack/Rspack hosts running MF 2.0 and lacks the new manifest/runtime-plugin/typescript-sync features.

`@module-federation/vite` is published by the official Module Federation team (the same group that ships `@module-federation/enhanced` for Webpack and the Rspack plugin). It is built on top of the MF 2.0 runtime, ships first-class manifest support, type sharing via `@module-federation/dts-plugin`, runtime plugins, and parity with the Rspack/Webpack federation experience. It is being adopted by Nx, Modernjs, and Bit, and is the documented path on `module-federation.io`. **Recommendation: `@module-federation/vite` at `^1.5.0` (or the latest 1.x) paired with `vite@^5.4.0` and `@vitejs/plugin-react@^4.3.0` on React 18.3.x.** Pin the plugin minor version because MF runtime semantics change between minors. The Origin plugin remains acceptable only for legacy projects already running it; do not start a new enterprise remote on it.

## Remote `apps/wc-frontend/vite.config.ts` (full)

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import path from 'node:path';
import pkg from './package.json';

const isProd = process.env.NODE_ENV === 'production';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'wc',
      filename: 'remoteEntry.js',
      manifest: true,
      exposes: {
        './WeeklyCommitApp': './src/WeeklyCommitApp.tsx',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: pkg.dependencies.react,
        },
        'react-dom': {
          singleton: true,
          requiredVersion: pkg.dependencies['react-dom'],
        },
        'react-router-dom': {
          singleton: true,
          requiredVersion: pkg.dependencies['react-router-dom'],
        },
        '@reduxjs/toolkit': {
          singleton: true,
          requiredVersion: pkg.dependencies['@reduxjs/toolkit'],
        },
        'react-redux': {
          singleton: true,
          requiredVersion: pkg.dependencies['react-redux'],
        },
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    cors: true,
  },
  preview: {
    port: 5174,
    strictPort: true,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  base: isProd ? (process.env.PUBLIC_PATH ?? '/wc/') : '/',
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: false,
    manifest: true,
    sourcemap: true,
    modulePreload: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
});
```

`target: 'esnext'` is required: MF for Vite emits top-level await in the federation runtime, which fails on older targets. `cssCodeSplit: false` keeps the remote's CSS in one file so the host can load it predictably. `modulePreload: false` avoids the host pre-loading every remote chunk on initial paint.

## Host integration (consuming the remote)

```ts
// apps/pa-host/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import pkg from './package.json';

const WC_REMOTE_URL =
  process.env.WC_REMOTE_URL ??
  'http://localhost:5174/remoteEntry.js';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'pa_host',
      remotes: {
        wc: {
          type: 'module',
          name: 'wc',
          entry: WC_REMOTE_URL,
          entryGlobalName: 'wc',
          shareScope: 'default',
        },
      },
      shared: {
        react: { singleton: true, requiredVersion: pkg.dependencies.react },
        'react-dom': { singleton: true, requiredVersion: pkg.dependencies['react-dom'] },
        'react-router-dom': { singleton: true, requiredVersion: pkg.dependencies['react-router-dom'] },
        '@reduxjs/toolkit': { singleton: true, requiredVersion: pkg.dependencies['@reduxjs/toolkit'] },
        'react-redux': { singleton: true, requiredVersion: pkg.dependencies['react-redux'] },
      },
    }),
  ],
  server: { port: 5173, strictPort: true },
  build: { target: 'esnext', minify: 'esbuild', manifest: true },
});
```

```tsx
// apps/pa-host/src/App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

const WeeklyCommitApp = React.lazy(() => import('wc/WeeklyCommitApp'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/weekly-commit/*"
          element={
            <Suspense fallback={<div className="p-8">Loading Weekly Commit…</div>}>
              <WeeklyCommitApp />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

```ts
// apps/pa-host/src/types/remotes.d.ts
declare module 'wc/WeeklyCommitApp' {
  const Component: React.ComponentType<Record<string, never>>;
  export default Component;
}
```

## Standalone dev wrapper

The remote app must NOT include a router or Redux Provider inside the exposed component — those belong to the host. Instead, `main.tsx` mounts a thin wrapper that supplies them only when running standalone.

```tsx
// apps/wc-frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import WeeklyCommitApp from './WeeklyCommitApp';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <WeeklyCommitApp />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>,
);
```

```tsx
// apps/wc-frontend/src/WeeklyCommitApp.tsx
import { Route, Routes } from 'react-router-dom';
import WeeklyCommitPage from './pages/WeeklyCommitPage';

export default function WeeklyCommitApp() {
  // Single route entry. No shell. No nav. Host or standalone wrapper owns Router + Provider.
  return (
    <Routes>
      <Route index element={<WeeklyCommitPage />} />
    </Routes>
  );
}
```

`yarn dev` runs `vite` on port 5174 and serves the wrapper. The host imports only `WeeklyCommitApp`, which assumes a Router and Redux store are already mounted upstream.

## Top 5 gotchas

- **Singleton mismatch ("Shared module is not available for eager consumption")** — Symptom: blank screen, console error on first remote import. Fix: declare every cross-app dep as `singleton: true` with matching `requiredVersion` in BOTH host and remote; align exact React 18.3.x patch in both `package.json` files.
- **React context loss across remotes** — Symptom: `useDispatch` returns undefined, `useNavigate` throws "must be used inside Router". Fix: never wrap the exposed component in its own `<BrowserRouter>` or `<Provider>`; only the host (or the standalone `main.tsx`) provides them, and react/react-redux/react-router-dom must all be singletons so context identity is preserved.
- **Tailwind class collision in host** — Symptom: remote styles bleed into host or vice versa, utility classes overridden. Fix: scope the remote's Tailwind with `prefix: 'wc-'` in `tailwind.config.js`, set `important: '#wc-root'` and wrap the exposed component's root in `<div id="wc-root">`. Keep `cssCodeSplit: false` so the remote ships one stylesheet that loads after the host's.
- **Runtime URL drift between dev / staging / CDN** — Symptom: host fetches `localhost:5174/remoteEntry.js` in production. Fix: drive `remotes.wc.entry` from `import.meta.env.VITE_WC_REMOTE_URL`, baked at host build time; for true runtime resolution use `@module-federation/runtime`'s `registerRemotes()` to inject the URL after env discovery.
- **CORS on `remoteEntry.js`** — Symptom: "blocked by CORS policy" or "MIME type text/html" when host fetches from CDN. Fix: serve the remote with `Access-Control-Allow-Origin: *` (or the host origin), `Content-Type: application/javascript`, and set Vite `preview.cors: true`. On CloudFront, attach a Response Headers Policy that adds CORS headers and the correct MIME for `.js`.

## CDN delivery (CloudFront)

Build the remote with `base: 'https://cdn.example.com/wc/'` (or set `PUBLIC_PATH` per-env), then upload `dist/` to S3 behind CloudFront. Because Vite emits `[name].[hash].js` filenames, every deploy is immutable and safe to cache forever; only `remoteEntry.js` and `mf-manifest.json` need short TTLs so the host picks up new exposes. Use a CloudFront Response Headers Policy to set `Access-Control-Allow-Origin: *`, `Cache-Control: public, max-age=31536000, immutable` for `/assets/*`, and `Cache-Control: public, max-age=60, must-revalidate` for `remoteEntry.js`. Invalidate `/remoteEntry.js` and `/mf-manifest.json` on every deploy.

```ts
// snippet for env-aware base + manifest
base: process.env.PUBLIC_PATH ?? '/',
build: {
  manifest: true,
  rollupOptions: {
    output: {
      entryFileNames: 'assets/[name].[hash].js',
      chunkFileNames: 'assets/[name].[hash].js',
      assetFileNames: 'assets/[name].[hash].[ext]',
    },
  },
},
```

## Sources

*Note: Live network/Context7 lookups were blocked in this environment; the brief reflects late-2025 ecosystem state from training data (cutoff January 2026). Verify exact plugin version pins against npm before shipping.*

- [Module Federation — Vite Plugin Guide — module-federation.io](https://module-federation.io/guide/basic/vite.html)
- [@module-federation/vite on npm — npmjs.com](https://www.npmjs.com/package/@module-federation/vite)
- [@originjs/vite-plugin-federation — github.com](https://github.com/originjs/vite-plugin-federation)
- [Module Federation 2.0 Runtime — module-federation.io](https://module-federation.io/guide/basic/runtime.html)
- [Vite 5 Build Options (base, manifest, target) — vite.dev](https://vite.dev/config/build-options.html)
- [Vite 5 Preview Server / CORS — vite.dev](https://vite.dev/config/preview-options.html)
- [React 18 Lazy + Suspense — react.dev](https://react.dev/reference/react/lazy)
- [react-router-dom v6 BrowserRouter — reactrouter.com](https://reactrouter.com/en/main/router-components/browser-router)
- [Redux Toolkit Provider setup — redux-toolkit.js.org](https://redux-toolkit.js.org/tutorials/quick-start)
- [CloudFront Response Headers Policies — docs.aws.amazon.com](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/creating-response-headers-policies.html)
- [Tailwind prefix / important config — tailwindcss.com](https://tailwindcss.com/docs/configuration#prefix)
