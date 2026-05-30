import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { HiOutlineMenu, HiOutlineX } from "react-icons/hi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";
import { ColignBrand } from "@/components/Brand";
import { Button, ThemeToggle } from "@/components/ui";
import { cn } from "@/lib/cn";

export function AppShell() {
  const auth = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { logout: auth0Logout } = useAuth0();
  const [menuOpen, setMenuOpen] = useState(false);

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
        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-50"
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

          <nav className="hidden md:flex items-center gap-5">
            <NavLink to="." end className={navLinkClass}>
              My week
            </NavLink>
            <NavLink to="reconcile" className={navLinkClass}>
              Reconcile
            </NavLink>
            {auth.role === "MANAGER" || auth.role === "ADMIN" ? (
              <NavLink to="manager" className={navLinkClass}>
                Team
              </NavLink>
            ) : null}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-500 pr-2 border-r border-neutral-200 dark:border-neutral-800">
              <span className="font-mono">{auth.email}</span>
              <span className="text-neutral-300 dark:text-neutral-700">·</span>
              <span className="uppercase tracking-wider">{auth.role}</span>
            </div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} data-cy="sign-out">
              Sign out
            </Button>

            <button
              type="button"
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
            {auth.role === "MANAGER" || auth.role === "ADMIN" ? (
              <NavLink to="manager" className={navLinkClass} onClick={() => setMenuOpen(false)}>
                Team
              </NavLink>
            ) : null}
            <div className="border-t border-neutral-200 dark:border-neutral-800 mt-2 pt-2 text-xs text-neutral-500 font-mono">
              {auth.email} · {auth.role}
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
