import { Navigate } from "react-router-dom";
import { HiSun, HiMoon, HiDesktopComputer } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import { useGetTeamQuery } from "@/api/team";
import { InviteForm } from "@/components/InviteForm";
import { MembersSection } from "@/components/workspace/MembersSection";
import { TeamSettingsSection } from "@/components/workspace/TeamSettingsSection";
import { canManageTeam } from "@/lib/permissions";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/cn";

/**
 * `/settings` — the workspace-management surface. Four stacked sections:
 *   - Team: name + description + avatar URL. Permission-gated.
 *   - Appearance: light / dark / system theme choice.
 *   - Members: all team members; remove button gated by canManage.
 *   - Invitations: the existing <InviteForm> + pending list.
 *
 * Theme used to live in the chrome (UserMenu, then UserChip popover); it's
 * been moved here because it's a settings concern, not an always-visible
 * control. Matches Notion / Linear / ChatGPT conventions.
 *
 * Teamless users land here only via direct URL — bounce them up to the
 * parent route ("/") so OnboardingGate can route them to /onboarding.
 */
export function WorkspaceSettingsPage() {
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const teamId = me?.teamId ?? null;
  const { data: team } = useGetTeamQuery({ teamId: teamId ?? 0 }, { skip: teamId == null });

  if (meLoading) return <Loading />;
  if (me && me.teamId == null) return <Navigate to=".." replace />;
  if (!me?.teamId) return null;

  const canManage = canManageTeam(me, team ?? null);

  return (
    <div className="px-4 sm:px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
        Workspace settings
      </h1>

      <section aria-labelledby="team-heading" className="mt-10">
        <h2
          id="team-heading"
          className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4"
        >
          Team
        </h2>
        <TeamSettingsSection teamId={me.teamId} canManage={canManage} />
      </section>

      <section aria-labelledby="appearance-heading" className="mt-12">
        <h2
          id="appearance-heading"
          className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4"
        >
          Appearance
        </h2>
        <AppearanceSection />
      </section>

      <section aria-labelledby="members-heading" className="mt-12">
        <h2
          id="members-heading"
          className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4"
        >
          Members
        </h2>
        <MembersSection
          teamId={me.teamId}
          canManage={canManage}
          currentUserId={me.id}
          teamLeadId={team?.leadUserId ?? null}
        />
      </section>

      <section aria-labelledby="invitations-heading" className="mt-12">
        <h2
          id="invitations-heading"
          className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-4"
        >
          Invitations
        </h2>
        <InviteForm teamId={me.teamId} />
      </section>
    </div>
  );
}

const THEME_OPTIONS: { value: Theme; label: string; Icon: typeof HiSun }[] = [
  { value: "light", label: "Light", Icon: HiSun },
  { value: "dark", label: "Dark", Icon: HiMoon },
  { value: "system", label: "System", Icon: HiDesktopComputer },
];

function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  return (
    <div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
        Choose the theme. <strong className="text-neutral-700 dark:text-neutral-300">System</strong>{" "}
        follows your operating system setting.
      </p>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Appearance"
        data-cy="appearance-options"
      >
        {THEME_OPTIONS.map(({ value, label, Icon }) => {
          const selected = theme === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              data-cy={`appearance-${value}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950",
                selected
                  ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                  : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div className="px-4 sm:px-6 py-10">
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
    </div>
  );
}
