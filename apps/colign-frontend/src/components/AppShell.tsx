import { Outlet, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch } from "@/store/hooks";
import { signOut } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";
import { useGetMeQuery } from "@/api/me";
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
 */
export function AppShell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { logout: auth0Logout } = useAuth0();
  const { data: me } = useGetMeQuery();

  const role = (me?.role ?? "IC") as "IC" | "MANAGER" | "ADMIN";

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
      onSignOut={handleSignOut}
    >
      <Outlet />
    </SidebarShell>
  );
}
