import { colignApi } from "./baseApi";
import type { OutcomeRefDto, SpringPage } from "./types";

export const outcomesApi = colignApi.injectEndpoints({
  endpoints: (build) => ({
    listOutcomes: build.query<SpringPage<OutcomeRefDto>, { page?: number; size?: number }>({
      query: ({ page = 0, size = 100 }) => `outcomes?page=${page}&size=${size}`,
      providesTags: ["Outcome"],
    }),
  }),
});

export const { useListOutcomesQuery } = outcomesApi;
