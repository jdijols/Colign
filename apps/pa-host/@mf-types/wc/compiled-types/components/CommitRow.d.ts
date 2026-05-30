import type { WeeklyCommitDto } from "@/api/types";
interface Props {
    commit: WeeklyCommitDto;
    canEdit: boolean;
    onDelete: () => void;
}
export declare function CommitRow({ commit, canEdit, onDelete }: Props): import("react/jsx-runtime").JSX.Element;
export {};
