export type AuthMode = "mock" | "real";

export const authMode: AuthMode =
  (import.meta.env.VITE_AUTH_MODE as AuthMode | undefined) ?? "mock";

export const auth0Config = {
  domain: import.meta.env.VITE_AUTH0_DOMAIN ?? "",
  clientId: import.meta.env.VITE_AUTH0_CLIENT_ID ?? "",
  audience: import.meta.env.VITE_AUTH0_AUDIENCE ?? "https://api.colign.org",
};

export const isReal = authMode === "real";
