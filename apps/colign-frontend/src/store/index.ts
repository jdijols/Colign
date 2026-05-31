import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { colignApi } from "@/api/baseApi";
import authReducer from "@/auth/authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [colignApi.reducerPath]: colignApi.reducer,
  },
  middleware: (getDefault) => getDefault().concat(colignApi.middleware),
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
