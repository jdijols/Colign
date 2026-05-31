import { Mermaid } from "../Mermaid";
import { Callout } from "../components/Callout";
import { Code } from "../components/Code";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

const FLOW = `
sequenceDiagram
  autonumber
  participant Browser
  participant Host as pa-host (:4173)
  participant Remote as wc-frontend remote (:5174)
  participant API as wc-backend (:8080)
  participant Auth0

  Browser->>Host: GET /weekly-commit/
  Host->>Remote: lazy import remoteEntry.js
  Remote->>Browser: render LoginPage (no token)
  Browser->>Auth0: Universal Login
  Auth0-->>Browser: redirect with code
  Browser->>Auth0: code -> token
  Auth0-->>Browser: JWT (signed RS256)
  Browser->>Remote: Auth0Bridge stores token in authSlice
  Remote->>API: GET /api/v1/plans/current<br/>Authorization: Bearer <jwt>
  API->>API: JwtDecoder validates issuer + audience + signature
  API->>API: UserResolver: find by email, else provision
  API-->>Remote: PlanDto
  Remote-->>Browser: render My Weekly Plan
`.trim();

export function AuthPage() {
  return (
    <article>
      <h1>Auth flow.</h1>
      <p className="arch-lead">
        A signed JWT identifies the caller. The backend validates it on every
        request, the frontend keeps it in Redux state, and a thin resolver
        materializes a domain <code>User</code> out of the token's claims.
      </p>

      <h2>The full sequence</h2>
      <Mermaid
        chart={FLOW}
        caption="One full request lifecycle: browser → Auth0 → host → remote → backend → Postgres."
      />

      <h2>Two modes: real and mock</h2>
      <p>
        The backend supports both an Auth0 tenant and a local mock-JWT path,
        switched by a single config key.{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/config/security/SecurityConfig.java" />:
      </p>

      <Code>{`return switch (mode.toLowerCase()) {
    case "real" -> buildRealDecoder(issuerUri, audience);
    case "mock" -> buildMockDecoder(resourceLoader, audience);
    default -> throw new IllegalStateException(
            "wc.auth.mode must be 'real' or 'mock' (got: " + mode + ")");
};`}</Code>

      <table className="arch-table">
        <thead>
          <tr><th>Mode</th><th>How tokens are validated</th><th>When to use</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>real</code></td>
            <td>
              <code>JwtDecoders.fromIssuerLocation(...)</code> fetches the
              tenant's JWKS and validates signature, issuer, and audience.
            </td>
            <td>Real Auth0 tenant. The intended production path.</td>
          </tr>
          <tr>
            <td><code>mock</code></td>
            <td>
              Loads a committed RS256 public key at{" "}
              <code>classpath:keys/colign-mock-public.pem</code> and validates
              against it.
            </td>
            <td>
              Local dev, CI, demos. Mint tokens with{" "}
              <code>node scripts/mock-jwt.mjs</code>.
            </td>
          </tr>
        </tbody>
      </table>

      <Callout tone="warn" title="The mock private key is committed in scripts/">
        That's deliberate — it lets a reviewer run the demo without setting up
        Auth0. The PEM and adjacent code are plastered with DEMO-ONLY warnings.
        Don't reuse this keypair for anything that touches production.
      </Callout>

      <h2>What's in the token</h2>
      <p>
        Both modes produce tokens with the same shape:
      </p>
      <table className="arch-table">
        <thead><tr><th>Claim</th><th>Source</th><th>Used for</th></tr></thead>
        <tbody>
          <tr><td><code>sub</code></td><td>Standard JWT subject</td><td>Stored on <code>app_user.auth0_sub</code>.</td></tr>
          <tr><td><code>email</code></td><td>Auth0 user profile</td><td>Used by <code>UserResolver</code> to find/provision the User row.</td></tr>
          <tr><td><code>aud</code></td><td>Token request</td><td>Must match <code>wc.auth.audience</code> on the backend.</td></tr>
          <tr><td><code>iss</code></td><td>Auth0 tenant</td><td>Must match <code>wc.auth.real.issuer-uri</code> (real mode only).</td></tr>
          <tr><td><code>https://colign.org/roles</code></td><td>Auth0 Action / mock script</td><td>Becomes the <code>ROLE_*</code> Spring authority.</td></tr>
          <tr><td><code>scope</code></td><td>OAuth2 scopes</td><td>Becomes the <code>SCOPE_*</code> Spring authority.</td></tr>
        </tbody>
      </table>

      <Callout tone="info" title="Why namespaced 'https://colign.org/roles'">
        Auth0 requires custom claims to be namespaced (a URL) so they can't
        collide with reserved OIDC claims. The string itself isn't a real URL —
        nothing fetches it — it's just a unique identifier.
      </Callout>

      <h2>From JWT to domain User</h2>
      <p>
        <code>UserResolver</code> bridges Spring Security's principal into a
        domain <code>User</code> row.{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/service/UserResolver.java" />:
      </p>

      <Code>{`@Transactional
public User resolveCurrent() {
    Jwt jwt = CurrentUser.jwt().orElseThrow(...);
    String email = jwt.getClaimAsString("email");
    return users.findByEmail(email).orElseGet(() -> provision(email, jwt.getSubject()));
}`}</Code>

      <p>
        Provisioning sets the role from <code>https://colign.org/roles</code> if
        present, falling back to <code>wc.users.default-role</code> (defaults
        to <code>IC</code>). Manager and team linkage are left null on
        provision — they get set later (today: by editing the seed; in
        production: by an invite flow).
      </p>

      <h2>Clock-skew leeway</h2>
      <p>
        Both modes register a 60-second leeway on the token timestamp
        validators. Default Spring Security leeway is zero, which causes
        flaky failures when client and server clocks drift. Line in{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/config/security/SecurityConfig.java" line={132} />:
      </p>
      <Code>{`OAuth2TokenValidator<Jwt> withTimestamp =
        new JwtTimestampValidator(Duration.ofSeconds(60));`}</Code>

      <h2>CORS</h2>
      <p>
        The backend allows the three dev origins where any of the frontends
        could be running: pa-host preview (<code>:4173</code>), pa-host dev
        (<code>:5173</code>), wc-frontend standalone (<code>:5174</code>),
        and one extra slot for <code>:3000</code>. Defined inline in
        <code>SecurityConfig.corsConfigurationSource()</code>.
      </p>

      <PageFooter prev={navLink("routes")} next={navLink("stack")} />
    </article>
  );
}
