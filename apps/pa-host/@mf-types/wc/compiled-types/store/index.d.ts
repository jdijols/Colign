export declare const store: import("@reduxjs/toolkit").EnhancedStore<{
    auth: import("@/auth/authSlice").AuthState;
    wcApi: import("@reduxjs/toolkit/query").CombinedState<{}, "Plan" | "Commit" | "Outcome" | "ChessTag" | "TeamPage", "wcApi">;
}, import("redux").UnknownAction, import("@reduxjs/toolkit").Tuple<[import("redux").StoreEnhancer<{
    dispatch: import("redux-thunk").ThunkDispatch<{
        auth: import("@/auth/authSlice").AuthState;
        wcApi: import("@reduxjs/toolkit/query").CombinedState<{}, "Plan" | "Commit" | "Outcome" | "ChessTag" | "TeamPage", "wcApi">;
    }, undefined, import("redux").UnknownAction>;
}>, import("redux").StoreEnhancer]>>;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
