import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

/**
 * Redirects to /login if no JWT is present.
 * For real-Auth0 mode this gets replaced by withAuthenticationRequired
 * from @auth0/auth0-react — same gate semantics.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const token = useAppSelector((s) => s.auth.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
