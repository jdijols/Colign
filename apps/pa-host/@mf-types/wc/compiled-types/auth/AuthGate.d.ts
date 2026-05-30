import { type ReactNode } from "react";
/**
 * Redirects to /login if no JWT is present.
 * For real-Auth0 mode this gets replaced by withAuthenticationRequired
 * from @auth0/auth0-react — same gate semantics.
 */
export declare function AuthGate({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
