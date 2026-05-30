import { type ReactNode } from "react";
/**
 * Syncs Auth0 SDK state into the Redux authSlice so RTK Query's baseApi
 * (which reads token from the store in `prepareHeaders`) keeps working
 * unchanged whether we're in real Auth0 mode or mock-JWT mode.
 *
 * Mock mode: this component is a passthrough — authSlice is populated by
 * LoginPage's call to /__dev__/mint.
 *
 * Real mode: this component listens for Auth0 auth-state changes, requests
 * the access token (cached in localStorage by the SDK), and dispatches it.
 * Role is derived from the namespaced "https://wc/roles" claim when present,
 * falling back to IC otherwise — the seeded UserResolver also enforces role
 * server-side based on the email match for the demo team.
 */
export declare function Auth0Bridge({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
