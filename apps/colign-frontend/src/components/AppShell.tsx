import { Outlet, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch } from "@/store/hooks";
import { signOut } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";
import { useGetMeQuery } from "@/api/me";
import { useGetTeamQuery } from "@/api/team";
import { canManageTeam } from "@/lib/permissions";
import { TIMELINE_TABS_ENABLED } from "@/lib/featureFlags";
import { SidebarShell } from "@/components/SidebarShell";

/**
 * Authenticated app chrome. Role + email come from {@code GET /me}, not the
 * Redux auth bootstrap — the bootstrap is a localStorage seed at sign-in
 * time and never reflects derived-role transitions (e.g. an IC whose first
 * report just accepted an invitation should see the Team rail entry on the
 * next render, not after a re-login).
 *
 * This shell now delegates layout entirely to {@link SidebarShell}: a
 * left-rail sidebar (workspace pill at top, four flat routes in the middle,
 * user chip at the bottom) with the routed page rendered to its right.
 * Narrow-viewport drawer collapse is handled inside SidebarShell.
 *
 * DESIGN.md: the shell is the canonical mount point for the "disciplined
 * editorial" baseline — the canvas background, sidebar surface, and antialias
 * settings live on the `<div id="colign-root">` and `<body>` (see index.css).
 * This component itself stays presentation-free; it only routes data into
 * SidebarShell and wires the Outlet. Visual tokens flow from SidebarShell.
 */
export function AppShell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { logout: auth0Logout } = useAuth0();
  const { data: me } = useGetMeQuery();
  // Team profile carries leadUserId, which canManageTeam needs to grant the
  // solo team lead (a derived IC) the Team rail entry before anyone reports to
  // them. Cached — /settings fetches the same query. Skipped until we have a team.
  const { data: team } = useGetTeamQuery({ teamId: me?.teamId ?? 0 }, { skip: me?.teamId == null });

  const role = (me?.role ?? "IC") as "IC" | "MANAGER" | "ADMIN";
  const showTeam = canManageTeam(me ?? null, team ?? null);

  const handleSignOut = () => {
    dispatch(signOut());
    if (isReal) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      navigate("login", { replace: true });
    }
  };

  return (
    <SidebarShell
      me={{
        teamName: me?.teamName,
        teamAvatarUrl: me?.teamAvatarUrl,
        displayName: me?.displayName ?? me?.email ?? "",
        email: me?.email ?? "",
        role,
      }}
      showTeam={showTeam}
      showTimelineTabs={TIMELINE_TABS_ENABLED}
      onSignOut={handleSignOut}
    >
      <Outlet />
    </SidebarShell>
  );
}
