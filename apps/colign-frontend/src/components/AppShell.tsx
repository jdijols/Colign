import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { useAppDispatch } from "@/store/hooks";
import { signOut } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";
import { useGetMeQuery } from "@/api/me";
import { ColignBrand } from "@/components/Brand";
import { TeamPill } from "@/components/TeamPill";
import { ThemeToggle } from "@/components/ui";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/cn";

/**
 * Authenticated app chrome. Role + email come from {@code GET /me}, not the
 * Redux auth bootstrap — that bootstrap is a localStorage seed at sign-in time
 * and never reflects derived-role transitions (e.g. an IC whose first REPORT
 * just accepted an invitation should see the "Team" link on next render, not
 * after a re-login).
 */
export function AppShell() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { logout: auth0Logout } = useAuth0();
  const { data: me } = useGetMeQuery();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = me?.role ?? "IC";
  const email = me?.email ?? "";
  const isManagerOrAdmin = role === "MANAGER" || role === "ADMIN";

  const handleSignOut = () => {
    dispatch(signOut());
    if (isReal) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      navigate("login", { replace: true });
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "text-sm transition-colors",
      isActive
        ? "text-neutral-900 dark:text-neutral-50 font-medium"
        : "text-neutral-600 hover:text-neutral-900 dark:hover:text-neutral-50"
    );

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 sticky top-0 z-30">
        <div className="px-4 sm:px-6 h-14 flex items-center gap-6">
          <Link
            to="."
            className="text-neutral-900 dark:text-neutral-50 hover:opacity-80 transition-opacity"
          >
            <ColignBrand size="md" />
          </Link>

          {me?.teamName && (
            <>
              <span aria-hidden className="text-neutral-300 dark:text-neutral-700">/</span>
              <TeamPill name={me.teamName} avatarUrl={me.teamAvatarUrl} />
            </>
          )}

          <nav className="hidden md:flex items-center gap-5">
            <NavLink to="." end className={navLinkClass}>
              My week
            </NavLink>
            <NavLink to="reconcile" className={navLinkClass}>
              Reconcile
            </NavLink>
            {isManagerOrAdmin ? (
              <NavLink to="manager" className={navLinkClass}>
                Team
              </NavLink>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <UserMenu
              email={email}
              role={role}
              avatarUrl={null /* user avatar comes in a later PR via /me extension */}
              displayName={me?.displayName ?? email}
              onSignOut={handleSignOut}
            />

            <button
              type="button"
              className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation"
            >
              {menuOpen ? (
                <HiOutlineX className="h-4 w-4" />
              ) : (
                <HiOutlineMenu className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex flex-col gap-2 text-sm">
            <NavLink to="." end className={navLinkClass} onClick={() => setMenuOpen(false)}>
              My week
            </NavLink>
            <NavLink to="reconcile" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              Reconcile
            </NavLink>
            {isManagerOrAdmin ? (
              <NavLink to="manager" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Team
              </NavLink>
            ) : null}
            <div className="border-t border-neutral-200 dark:border-neutral-800 mt-2 pt-2 text-xs text-neutral-600 font-mono">
              {email} · {role}
            </div>
          </nav>
        )}
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
