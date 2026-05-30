export interface AuthState {
    token: string | null;
    email: string | null;
    role: "IC" | "MANAGER" | "ADMIN" | null;
}
export declare const signIn: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    token: string;
    email: string;
    role: AuthState["role"];
}, "auth/signIn">, signOut: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"auth/signOut">;
declare const _default: import("redux").Reducer<AuthState>;
export default _default;
