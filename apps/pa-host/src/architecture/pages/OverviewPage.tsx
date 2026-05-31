import { Mermaid } from "../Mermaid";
import { Callout } from "../components/Callout";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

const SYSTEM_DIAGRAM = `
flowchart LR
  user([IC or Manager])
  host["pa-host<br/>Vite shell · :4173"]
  remote["wc-frontend<br/>MF remote · :5174"]
  api["wc-backend<br/>Spring Boot · :8080"]
  db[("Postgres 16<br/>schema: wc")]
  auth0(("Auth0"))

  user -->|browser| host
  host -.->|loads remoteEntry.js<br/>at runtime| remote
  host -->|/weekly-commit/*| remote
  remote -->|/api/v1/* + JWT| api
  api -->|JPA / Flyway| db
  user -.->|login redirect| auth0
  auth0 -.->|JWT| host
`.trim();

export function OverviewPage() {
  return (
    <article>
      <h1>colign / onboarding.</h1>
      <p className="arch-lead">
        A guided tour for engineers joining colign — the Weekly Commit module
        built for the ST6 partnership submission and opened up as an
        MIT-licensed project at{" "}
        <a href="https://colign.org" target="_blank" rel="noopener noreferrer">
          colign.org
        </a>
        . The pages below cover what the app does, how the pieces fit, who can
        see what, and where to make your first contribution.
      </p>

      <h2>What colign is, in one paragraph</h2>
      <p>
        colign replaces the weekly planning surface of 15-Five. The
        differentiator is structural: every weekly commitment carries a
        non-nullable foreign key to a leaf <code>Outcome</code> in the
        organization's strategy hierarchy. You cannot save a commit that
        doesn't link to strategy — the database won't let you. Managers see
        their direct reports in a roll-up with an alignment percentage, and
        the lifecycle of each plan (draft → locked → reconciled → carry forward)
        is enforced in the service layer, not by trust.
      </p>

      <h2>The three apps</h2>
      <p>
        colign is a small monorepo with three apps. They run independently in dev:
      </p>

      <table className="arch-table">
        <thead>
          <tr>
            <th>App</th>
            <th>What it is</th>
            <th>Dev port</th>
            <th>Stack</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <FileRef path="apps/colign-backend" />
            </td>
            <td>REST API + Postgres. Owns the data model and lifecycle.</td>
            <td>:8080</td>
            <td>Spring Boot 3.3 · Java 21 · Flyway · Auth0 JWT</td>
          </tr>
          <tr>
            <td>
              <FileRef path="apps/colign-frontend" />
            </td>
            <td>The user-facing screens, exposed as a Module Federation remote.</td>
            <td>:5174</td>
            <td>Vite 5 · React 18 · RTK Query · Flowbite · Tailwind</td>
          </tr>
          <tr>
            <td>
              <FileRef path="apps/pa-host" />
            </td>
            <td>The host shell. Loads the WC remote at runtime. Hosts this site.</td>
            <td>:4173</td>
            <td>Vite 5 · React 18 · react-router-dom</td>
          </tr>
        </tbody>
      </table>

      <h2>Big picture</h2>

      <Mermaid
        chart={SYSTEM_DIAGRAM}
        caption="At runtime: the host fetches the remote's entry script, the remote calls the backend with the user's JWT, the backend talks to Postgres. Auth0 issues the token."
      />

      <h2>How to read this site</h2>
      <p>
        Sections are ordered from "people and rules" outward to "tech stack." If
        you read top-to-bottom you'll walk through the same path I'd take a new
        engineer through verbally:
      </p>

      <ol>
        <li>
          <strong>People & Permissions</strong> — who exists in the system, who
          they report to, and what they can see.
        </li>
        <li>
          <strong>Data Model</strong> — the nine tables and how they link.
        </li>
        <li>
          <strong>The Weekly Lifecycle</strong> — the five states a plan moves
          through and the rules that gate each transition.
        </li>
        <li>
          <strong>Routes & Screens</strong> — the URL map and what each screen
          does.
        </li>
        <li>
          <strong>Auth Flow</strong> — how a request gets from "I clicked a
          button" to a row in Postgres.
        </li>
        <li>
          <strong>Stack & Module Federation</strong> — the framework choices and
          why the host/remote split exists.
        </li>
        <li>
          <strong>Glossary & Where to Start</strong> — vocabulary plus a list of
          good-first-contribution-shaped tasks.
        </li>
      </ol>

      <Callout tone="info" title="This site is hand-written, not generated">
        Every fact here is grounded in real files in the repo — file paths are
        shown with a badge like the ones above. If the code changes and the
        site drifts, fix the page. Treat it like any other piece of code.
      </Callout>

      <Callout tone="info" title="A note on naming">
        The brief and most of the source files refer to the product as the
        Weekly Commit module, or <code>wc</code>. The public-facing name is
        <strong> colign</strong>. They mean the same thing — the rest of this
        site uses "colign" where humans would talk about it and{" "}
        <code>wc-*</code> where the file paths and module names do.
      </Callout>

      <PageFooter next={navLink("people")} />
    </article>
  );
}
