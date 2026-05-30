import { wcApi } from "./baseApi";
import type { ChessTagDto } from "./types";

export const chessTagsApi = wcApi.injectEndpoints({
  endpoints: (build) => ({
    listChessTags: build.query<ChessTagDto[], void>({
      query: () => "chess-tags",
      providesTags: ["ChessTag"],
    }),
  }),
});

export const { useListChessTagsQuery } = chessTagsApi;
