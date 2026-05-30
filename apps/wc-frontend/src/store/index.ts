import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { wcApi } from "@/api/baseApi";
import authReducer from "@/auth/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [wcApi.reducerPath]: wcApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(wcApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
