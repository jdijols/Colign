import { colignApi } from "./baseApi";
import type { OutcomeRefDto, SpringPage } from "./types";

export const outcomesApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    listOutcomes: build.query<
      SpringPage<OutcomeRefDto>,
      { page?: number; size?: number; includeRetired?: boolean }
    >({
      query: ({ page = 0, size = 100, includeRetired = false }) =>
        `outcomes?page=${page}&size=${size}&includeRetired=${includeRetired}`,
      providesTags: ["Outcome"],
    }),
  }),
});

export const { useListOutcomesQuery } = outcomesApi;
