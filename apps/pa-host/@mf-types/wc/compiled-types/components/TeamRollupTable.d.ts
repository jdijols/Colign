import type { TeamMemberDto } from "@/api/types";
interface Props {
    onSelectMember: (m: TeamMemberDto) => void;
}
export declare function TeamRollupTable({ onSelectMember }: Props): import("react/jsx-runtime").JSX.Element;
export {};
