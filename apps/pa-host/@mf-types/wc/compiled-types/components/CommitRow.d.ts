import type { WeeklyCommitDto } from "@/api/types";
interface CommitRowProps {
    commit: WeeklyCommitDto;
    canEdit: boolean;
    onDelete: () => void;
}
export declare function CommitRow({ commit, canEdit, onDelete }: CommitRowProps): import("react/jsx-runtime").JSX.Element;
export {};
