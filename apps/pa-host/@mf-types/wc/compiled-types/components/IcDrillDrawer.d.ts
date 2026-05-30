import type { TeamMemberDto } from "@/api/types";
interface Props {
    member: TeamMemberDto | null;
    onClose: () => void;
}
export declare function IcDrillDrawer({ member, onClose }: Props): import("react/jsx-runtime").JSX.Element;
export {};
