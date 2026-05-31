import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

const STORAGE_KEY = "colign_jwt";
const ROLE_KEY = "colign_role";
const EMAIL_KEY = "colign_email";

export interface AuthState {
  token: string | null;
  email: string | null;
  role: "IC" | "MANAGER" | "ADMIN" | null;
  /**
   * Set when token acquisition fails (e.g. Auth0 getAccessTokenSilently throws
   * consent_required / login_required). Lets AuthGate surface the failure with a
   * retry instead of hanging forever on "Signing you in…".
   */
  error: string | null;
}

function initial(): AuthState {
  if (typeof window === "undefined")
    return { token: null, email: null, role: null, error: null };
  return {
    token: window.localStorage.getItem(STORAGE_KEY),
    email: window.localStorage.getItem(EMAIL_KEY),
    role: window.localStorage.getItem(ROLE_KEY) as AuthState["role"],
    error: null,
  };
}

const slice = createSlice({
  name: "auth",
  initialState: initial(),
  reducers: {
    signIn(state, action: PayloadAction<{ token: string; email: string; role: AuthState["role"] }>) {
      state.token = action.payload.token;
      state.email = action.payload.email;
      state.role = action.payload.role;
      state.error = null;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, action.payload.token);
        if (action.payload.email) window.localStorage.setItem(EMAIL_KEY, action.payload.email);
        if (action.payload.role) window.localStorage.setItem(ROLE_KEY, action.payload.role);
      }
    },
    authError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    },
    signOut(state) {
      state.token = null;
      state.email = null;
      state.role = null;
      state.error = null;
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem(EMAIL_KEY);
        window.localStorage.removeItem(ROLE_KEY);
      }
    },
  },
});

export const { signIn, authError, signOut } = slice.actions;
export default slice.reducer;
