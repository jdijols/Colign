import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/auth/authSlice";
import { isReal } from "@/auth/auth0Config";

export function AppShell() {
  const auth = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { logout: auth0Logout } = useAuth0();

  const handleSignOut = () => {
    dispatch(signOut());
    if (isReal) {
      // Auth0 logout — clears the SDK session AND the upstream Auth0 cookie.
      // returnTo must match an Allowed Logout URL in the Auth0 dashboard.
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      navigate("login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar fluid className="border-b border-gray-200 dark:border-gray-800">
        {/* All `to` props are relative so the shell works correctly both
            standalone (/) and when nested under the host (/weekly-commit/). */}
        <NavbarBrand as={Link} to=".">
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            Weekly Commit
          </span>
        </NavbarBrand>
        <div className="flex md:order-2 items-center gap-3">
          <span className="text-xs text-gray-500 hidden md:inline">
            {auth.email} · {auth.role}
          </span>
          <Button size="xs" color="light" onClick={handleSignOut} data-cy="sign-out">
            Sign out
          </Button>
          <NavbarToggle />
        </div>
        <NavbarCollapse>
          <NavbarLink as={NavLink} to="." end>
            My week
          </NavbarLink>
          <NavbarLink as={NavLink} to="reconcile">
            Reconcile
          </NavbarLink>
          {auth.role === "MANAGER" || auth.role === "ADMIN" ? (
            <NavbarLink as={NavLink} to="manager">
              Team
            </NavbarLink>
          ) : null}
        </NavbarCollapse>
      </Navbar>

      <main>
        <Outlet />
      </main>
    </div>
  );
}
