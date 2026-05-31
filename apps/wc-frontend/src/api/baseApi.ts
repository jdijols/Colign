import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";

export const wcApi = createApi({
  reducerPath: "wcApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api/v1/",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) headers.set("authorization", `Bearer ${token}`);
      headers.set("accept", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Plan", "Commit", "Outcome", "ChessTag", "TeamPage", "Me", "TeamMembers"],
  endpoints: () => ({}),
});
