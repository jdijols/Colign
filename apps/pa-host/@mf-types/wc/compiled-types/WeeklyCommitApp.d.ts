/**
 * The MF-remote entry. Self-contains Redux Provider + Auth0Bridge so the host
 * doesn't need to know about the WC store. The host (or standalone main.tsx)
 * owns the BrowserRouter AND the Auth0ProviderWithRouter — both must live above
 * this component so router context + Auth0 client are available to the bridge.
 *
 * In mock mode, Auth0Bridge is a no-op passthrough.
 */
export default function WeeklyCommitApp(): import("react/jsx-runtime").JSX.Element;
