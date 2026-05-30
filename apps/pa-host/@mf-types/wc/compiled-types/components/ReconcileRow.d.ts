import type { WeeklyCommitDto } from "@/api/types";
interface Props {
    commit: WeeklyCommitDto;
    expanded: boolean;
    onToggle: () => void;
}
export declare function ReconcileRow({ commit, expanded, onToggle }: Props): import("react/jsx-runtime").JSX.Element;
export {};
