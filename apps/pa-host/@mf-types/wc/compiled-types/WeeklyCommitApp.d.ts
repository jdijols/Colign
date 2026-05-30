/**
 * The MF-remote entry. Self-contains its Redux Provider so the host doesn't
 * need to know about the WC store. The host (or standalone main.tsx) still
 * owns the BrowserRouter — required because both apps must agree on the
 * URL context for nav and back-button behavior.
 */
export default function WeeklyCommitApp(): import("react/jsx-runtime").JSX.Element;
