import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Navbar, NavbarBrand, NavbarCollapse, NavbarLink, NavbarToggle } from "flowbite-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signOut } from "@/auth/authSlice";

export function AppShell() {
  const auth = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar fluid className="border-b border-gray-200 dark:border-gray-800">
        <NavbarBrand as={Link} to="/">
          <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">
            Weekly Commit
          </span>
        </NavbarBrand>
        <div className="flex md:order-2 items-center gap-3">
          <span className="text-xs text-gray-500 hidden md:inline">
            {auth.email} · {auth.role}
          </span>
          <Button
            size="xs"
            color="light"
            onClick={() => {
              dispatch(signOut());
              navigate("/login", { replace: true });
            }}
          >
            Sign out
          </Button>
          <NavbarToggle />
        </div>
        <NavbarCollapse>
          <NavbarLink as={NavLink} to="/" end>
            My week
          </NavbarLink>
          <NavbarLink as={NavLink} to="/reconcile">
            Reconcile
          </NavbarLink>
          {auth.role === "MANAGER" || auth.role === "ADMIN" ? (
            <NavbarLink as={NavLink} to="/manager">
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
