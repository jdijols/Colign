export declare const useAppDispatch: import("react-redux").UseDispatch<import("redux-thunk").ThunkDispatch<{
    auth: import("../auth/authSlice").AuthState;
    wcApi: import("@reduxjs/toolkit/query").CombinedState<{}, "Plan" | "Commit" | "Outcome" | "ChessTag" | "TeamPage", "wcApi">;
}, undefined, import("redux").UnknownAction> & import("redux").Dispatch<import("redux").UnknownAction>>;
export declare const useAppSelector: import("react-redux").UseSelector<{
    auth: import("../auth/authSlice").AuthState;
    wcApi: import("@reduxjs/toolkit/query").CombinedState<{}, "Plan" | "Commit" | "Outcome" | "ChessTag" | "TeamPage", "wcApi">;
}>;
