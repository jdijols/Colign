import { Mermaid } from "../Mermaid";
import { Callout } from "../components/Callout";
import { Code } from "../components/Code";
import { FileRef } from "../components/FileRef";
import { PageFooter } from "../components/PageFooter";
import { navLink } from "../nav";

const ORG_DIAGRAM = `
flowchart TB
  team["Team<br/>id, name"]
  mgr["User #1<br/>role: MANAGER<br/>team_id → Team<br/>manager_id: null"]
  ic1["User #2<br/>role: IC<br/>manager_id → User #1"]
  ic2["User #3<br/>role: IC<br/>manager_id → User #1"]
  ic3["User #4<br/>role: IC<br/>manager_id → User #1"]
  admin["User #5<br/>role: ADMIN<br/>(no manager, no team)"]

  team --> mgr
  team --> ic1
  team --> ic2
  team --> ic3
  mgr --> ic1
  mgr --> ic2
  mgr --> ic3
`.trim();

export function PeoplePage() {
  return (
    <article>
      <h1>People & permissions.</h1>
      <p className="arch-lead">
        Three concepts: an individual <code>User</code>, a <code>Team</code> that
        groups users, and a self-FK on the User table that points each report at
        their manager. Permissions in colign fall out of that shape rather than
        being defined separately.
      </p>

      <h2>The three roles</h2>
      <p>
        A user's role lives on the user row itself as an enum column. Defined in{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/domain/UserRole.java" />:
      </p>
      <Code>{`public enum UserRole {
    IC,
    MANAGER,
    ADMIN
}`}</Code>

      <table className="arch-table">
        <thead>
          <tr>
            <th>Role</th>
            <th>What they do in colign</th>
            <th>Can see</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span className="arch-chip arch-chip-ic">IC</span>
            </td>
            <td>Plans their week, locks it, reconciles at the end.</td>
            <td>Their own plan + the RCDO catalog of outcomes they can link to.</td>
          </tr>
          <tr>
            <td>
              <span className="arch-chip arch-chip-manager">Manager</span>
            </td>
            <td>Reviews their direct reports' plans + reconciliations.</td>
            <td>Their own plan + every IC whose <code>manager_id</code> = their user id.</td>
          </tr>
          <tr>
            <td>
              <span className="arch-chip arch-chip-admin">Admin</span>
            </td>
            <td>Seeded for future RCDO catalog editing.</td>
            <td>Reserved — no admin screens are wired up in v1.</td>
          </tr>
        </tbody>
      </table>

      <h2>How a user relates to a team and a manager</h2>
      <p>
        Two columns on <code>app_user</code> carry the relationships:
        {" "}
        <code>team_id</code> points at <code>team</code>, and{" "}
        <code>manager_id</code> is a self-FK back into <code>app_user</code>.
        Defined in{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/domain/User.java" />:
      </p>
      <Code>{`@Column(name = "manager_id")
private Long managerId;

@Column(name = "team_id")
private Long teamId;`}</Code>

      <p>
        Visually, a team with one manager and three reports looks like this.
        Note that the manager themselves is part of the team — they're a
        <code>User</code> like anyone else — they just also happen to be
        pointed at by other users' <code>manager_id</code>:
      </p>

      <Mermaid
        chart={ORG_DIAGRAM}
        caption="One Team, one Manager, three ICs. The Admin sits outside any team. Self-FK shown as arrows from each IC to their manager."
      />

      <h2>Who sees what — the load-bearing line of code</h2>
      <p>
        Manager visibility is enforced at the query layer in{" "}
        <FileRef
          path="apps/wc-backend/src/main/java/com/wc/controller/ManagerController.java"
          line={51}
        />
        . The manager calls <code>GET /api/v1/manager/team</code>, and the
        controller resolves their <code>User</code> from the JWT, then asks the
        repository for everyone where <code>manager_id</code> equals the caller's
        id:
      </p>

      <Code>{`@GetMapping("/team")
public Page<TeamMemberDto> team(@PageableDefault(...) Pageable pageable) {
    User me = userResolver.resolveCurrent();
    Page<User> directs = userRepo.findByManagerId(me.getId(), capped);
    return directs.map(ic -> /* hydrate each IC's latest plan */);
}`}</Code>

      <Callout tone="ok" title="The permission rule, in one sentence">
        A manager sees an IC if and only if <code>app_user.manager_id</code> on
        the IC row equals the manager's <code>id</code>. No separate ACL table,
        no role-on-role check. Move the IC under a different manager and the
        roll-up follows.
      </Callout>

      <h2>How a user gets created in the first place</h2>
      <p>
        colign does not have a "create user" form. The first time someone logs
        in with a valid JWT, the backend lazy-provisions a <code>User</code>
        row for them. This lives in{" "}
        <FileRef path="apps/wc-backend/src/main/java/com/wc/service/UserResolver.java" />:
      </p>
      <Code>{`@Transactional
public User resolveCurrent() {
    Jwt jwt = CurrentUser.jwt().orElseThrow(...);
    String email = jwt.getClaimAsString("email");
    return users.findByEmail(email)
            .orElseGet(() -> provision(email, jwt.getSubject()));
}`}</Code>

      <p>
        The provisioned user's role comes from the JWT's{" "}
        <code>https://colign.org/roles</code> claim if present (Auth0 sets this), or
        falls back to <code>IC</code> via the <code>wc.users.default-role</code>{" "}
        config key.
      </p>

      <Callout tone="warn" title="Lazy provisioning is a demo shortcut">
        In production this would be tightened: invite-only, manager linkage set
        on invite acceptance, soft-delete on offboarding. The class's Javadoc
        spells this out as a "production hardening" follow-up.
      </Callout>

      <h2>Demo accounts in the seed</h2>
      <p>
        Migration{" "}
        <FileRef path="apps/wc-backend/src/main/resources/db/migration/V3__seed_users.sql" />{" "}
        seeds a working org so the demo flow works out of the box:
      </p>
      <ul>
        <li>
          <code>manager@st6.dev</code> — role <code>MANAGER</code>, on the
          Engineering team.
        </li>
        <li>
          <code>ada@st6.dev</code>, <code>ben@st6.dev</code>,{" "}
          <code>chris@st6.dev</code> — role <code>IC</code>, manager set to{" "}
          <code>manager@st6.dev</code>, same team.
        </li>
        <li>
          <code>admin@st6.dev</code> — role <code>ADMIN</code>, no team.
        </li>
      </ul>
      <p>
        Mint a JWT for any of them in dev with{" "}
        <code>node scripts/mock-jwt.mjs --email ada@st6.dev --role IC</code>{" "}
        (see <FileRef path="apps/wc-backend/docs/AUTH0_SETUP.md" /> for the real-Auth0 path).
      </p>

      <PageFooter prev={navLink("overview")} next={navLink("data")} />
    </article>
  );
}
