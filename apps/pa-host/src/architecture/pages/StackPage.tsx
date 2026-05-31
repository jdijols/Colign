import { Mermaid } from "../Mermaid";
import { Callout } from "../components/Callout";
import { Code } from "../components/Code";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

const MF_DIAGRAM = `
flowchart LR
  subgraph host["pa-host on port 4173"]
    paApp["App.tsx<br/>routes /weekly-commit/*"]
    paLazy["React.lazy import"]
  end

  subgraph remote["wc-frontend on port 5174"]
    wcEntry["remoteEntry.js<br/>exposed by module-federation/vite"]
    wcApp["WeeklyCommitApp.tsx<br/>Provider + Routes"]
  end

  subgraph shared["Shared singletons"]
    direction TB
    react["react"]
    rdom["react-dom"]
    rrd["react-router-dom"]
    rtk["redux-toolkit"]
    rredux["react-redux"]
  end

  paLazy -.runtime fetch.-> wcEntry
  wcEntry --> wcApp
  paApp --- shared
  wcApp --- shared
`.trim();

export function StackPage() {
  return (
    <article>
      <h1>Stack & module federation.</h1>
      <p className="arch-lead">
        Three apps, three roles, one runtime contract. The host has no
        compile-time dependency on the remote — the remote's entry script is
        fetched at runtime and the two share React singletons so context
        identity survives the boundary.
      </p>

      <h2>Why this exists</h2>
      <p>
        The fictional PA platform already has its own shell and login. colign
        is one of several modules that should plug into that shell without
        forcing a coordinated re-deploy. Module Federation gives each module
        its own repo, its own build, and its own deploy cadence, while still
        composing into one URL at runtime.
      </p>

      <Mermaid
        chart={MF_DIAGRAM}
        caption="Host lazy-imports the remote. Both reference the same module instances of React, ReactDOM, react-router-dom, and the Redux libraries."
      />

      <h2>The runtime contract, in two files</h2>

      <h3>The host says "I will fetch a remote called wc"</h3>
      <p>
        <FileRef path="apps/pa-host/vite.config.ts" />:
      </p>
      <Code>{`federation({
  name: "pa_host",
  remotes: {
    wc: {
      type: "module",
      name: "wc",
      entry: COLIGN_REMOTE_URL, // defaults to http://localhost:5174/remoteEntry.js
      entryGlobalName: "wc",
      shareScope: "default",
    },
  },
  shared: {
    react: { singleton: true, ... },
    "react-dom": { singleton: true, ... },
    "react-router-dom": { singleton: true, ... },
    "@reduxjs/toolkit": { singleton: true, ... },
    "react-redux": { singleton: true, ... },
  },
})`}</Code>

      <h3>The remote says "I expose WeeklyCommitApp"</h3>
      <p>
        <FileRef path="apps/wc-frontend/vite.config.ts" /> (the symmetric side
        — the file declares <code>exposes: {`{ "./WeeklyCommitApp": "./src/WeeklyCommitApp.tsx" }`}</code>{" "}
        and the same <code>shared</code> block).
      </p>

      <h2>How the same code runs standalone and embedded</h2>
      <p>
        The exposed <code>WeeklyCommitApp</code> is just a React component. It
        does NOT bring its own <code>BrowserRouter</code> or{" "}
        <code>Auth0Provider</code>. Those have to live above it. Two callers
        provide them:
      </p>

      <table className="arch-table">
        <thead><tr><th>Caller</th><th>What wraps WeeklyCommitApp</th></tr></thead>
        <tbody>
          <tr>
            <td>Standalone (<code>:5174</code>)</td>
            <td>
              <FileRef path="apps/wc-frontend/src/main.tsx" /> wraps it in{" "}
              <code>{`<BrowserRouter><Auth0ProviderWithRouter>...`}</code>.
            </td>
          </tr>
          <tr>
            <td>Embedded in pa-host</td>
            <td>
              <FileRef path="apps/pa-host/src/main.tsx" /> does the same thing
              for the host shell.{" "}
              <FileRef path="apps/pa-host/src/App.tsx" /> mounts the lazy import
              at <code>/weekly-commit/*</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <Callout tone="info" title="Why singletons matter">
        If pa-host and wc-frontend each ran their own copy of react-router-dom,
        the router context the host created would be invisible to the remote,
        and useNavigate() calls inside the remote would throw. Marking the five
        libraries as singletons forces both bundles to share one instance at
        runtime.
      </Callout>

      <h2>The three apps, side by side</h2>

      <table className="arch-table">
        <thead><tr><th>App</th><th>Build target</th><th>Top-level files</th></tr></thead>
        <tbody>
          <tr>
            <td><strong>wc-backend</strong></td>
            <td>Spring Boot JAR (Java 21)</td>
            <td>
              <FileRef path="apps/wc-backend/pom.xml" />,{" "}
              <FileRef path="apps/wc-backend/src/main/java/com/wc/WcApplication.java" />
            </td>
          </tr>
          <tr>
            <td><strong>wc-frontend</strong></td>
            <td>Vite + MF remote (static bundle + remoteEntry.js)</td>
            <td>
              <FileRef path="apps/wc-frontend/vite.config.ts" />,{" "}
              <FileRef path="apps/wc-frontend/src/WeeklyCommitApp.tsx" />,{" "}
              <FileRef path="apps/wc-frontend/src/main.tsx" />
            </td>
          </tr>
          <tr>
            <td><strong>pa-host</strong></td>
            <td>Vite static bundle (consumes remote at runtime)</td>
            <td>
              <FileRef path="apps/pa-host/vite.config.ts" />,{" "}
              <FileRef path="apps/pa-host/src/App.tsx" />
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Local dev — the commands a new engineer needs</h2>

      <Code>{`# 1. Backend (Postgres + Flyway + Spring Boot)
cd apps/wc-backend
./mvnw spring-boot:run                       # default profile uses Postgres
SPRING_PROFILES_ACTIVE=h2 ./mvnw spring-boot:run   # in-memory H2 alternative

# 2. WC remote (in another terminal)
yarn workspace wc-frontend dev               # http://localhost:5174

# 3. PA host (in a third terminal)
yarn workspace pa-host dev                   # http://localhost:4173

# Mint a demo JWT (mock mode)
node scripts/mock-jwt.mjs --email ada@st6.dev --role IC

# Run tests
cd apps/wc-backend && ./mvnw verify          # JaCoCo 80% gate
yarn workspace wc-frontend test              # Vitest
yarn workspace wc-frontend cy:run            # Cypress + Cucumber`}</Code>

      <Callout tone="ok" title="Pa-host's dev server has a /__dev__/mint shortcut">
        See <FileRef path="apps/pa-host/vite.config.ts" line={45} />. The host's
        Vite middleware exposes the same mock-mint endpoint that wc-frontend
        has, so the embedded LoginPage can call it without crossing origins.
      </Callout>

      <h2>Why this stack</h2>
      <ul>
        <li>
          <strong>Spring Boot 3.3 + Java 21:</strong> matches the PA platform's
          backend stack. JPA + Flyway is the de-facto enterprise default.
        </li>
        <li>
          <strong>RTK Query (not Saga/Thunk):</strong> the brief mandates it,
          and it gives free cache invalidation via tag-based mutations.
        </li>
        <li>
          <strong>Flowbite + Tailwind:</strong> the brief forbids CSS Modules /
          styled-components. Flowbite is a Tailwind-native component library.
        </li>
        <li>
          <strong>Vite + @module-federation/vite:</strong> the official MF team's
          Vite plugin. Webpack's federation plugin doesn't apply since neither
          app uses webpack.
        </li>
        <li>
          <strong>Cypress + Cucumber:</strong> the brief calls for BDD/Gherkin
          syntax; <code>@badeball/cypress-cucumber-preprocessor</code> is the
          current maintained path.
        </li>
      </ul>

      <PageFooter prev={navLink("auth")} next={navLink("glossary")} />
    </article>
  );
}
