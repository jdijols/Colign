import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { HiArrowRight, HiOutlineClipboardCopy, HiCheckCircle } from "react-icons/hi";
import { useGetMeQuery } from "@/api/me";
import {
  useCreateInvitationMutation,
  useListInvitationsQuery,
  type InvitationDto,
  type InvitationRelationship,
} from "@/api/invites";
import { ColignBrand } from "@/components/Brand";

/**
 * Post-create-team step — "now invite your teammates." Per the minimize-actions
 * principle, this is the only screen that surfaces between {@code POST /teams}
 * and the actual app: one email at a time, REPORT/PEER picker, pending list
 * inline. Skipping is one click. Re-entry is fine — sending more invites
 * later just adds rows.
 *
 * Lives under AuthGate (not OnboardingGate) so a teamless user can't reach it
 * — they get bounced to /onboarding by the early return below — and a freshly
 * teamed user can.
 */
export function InviteTeammatesPage() {
  const navigate = useNavigate();
  const { data: me, isLoading: meLoading } = useGetMeQuery();
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState<InvitationRelationship>("REPORT");
  const [createInvitation, { isLoading: sending }] = useCreateInvitationMutation();
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState<string | null>(null);

  const teamId = me?.teamId ?? null;
  const { data: invites } = useListInvitationsQuery(
    { teamId: teamId ?? 0 },
    { skip: teamId == null }
  );

  // Cheap RFC-shaped email check; the backend is the real authority (it
  // re-validates with @Email), but gating the button on a syntactic check
  // means the disabled state is meaningful — clicking only ever fails for
  // genuine server-side reasons, not "looks like you forgot the @".
  const trimmedEmail = email.trim();
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const canSend = isValidEmail && !sending;
  const hasSentAtLeastOne = (invites?.length ?? 0) > 0;

  if (meLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading…</span>
      </div>
    );
  }
  // Teamless users belong on /onboarding; this screen requires a team.
  if (me && me.teamId == null) {
    return <Navigate to=".." replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId || !canSend) return;
    setError(null);
    try {
      await createInvitation({ teamId, body: { email: trimmedEmail, relationship } }).unwrap();
      setJustSent(trimmedEmail);
      setEmail("");
      // Keep relationship sticky — most invites in a single session lean one way.
      setTimeout(() => setJustSent(null), 4000);
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const data = (err as { data?: { detail?: string } })?.data;
      setError(
        data?.detail ??
          (status === 400
            ? "That email doesn't look right."
            : status === 502
            ? "Couldn't deliver the email. Check the Resend key and try again."
            : "Couldn't send the invitation. Please try again.")
      );
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center text-neutral-900 dark:text-neutral-50">
          <ColignBrand size="lg" />
        </div>

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50 text-center">
          Invite your team
        </h1>
        <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 text-center leading-relaxed">
          Invite teammates to align your week together — or skip and start solo.
        </p>

        <form onSubmit={submit} className="mt-8" aria-label="Invite a teammate">
          <label htmlFor="invite-email" className="sr-only">
            Email
          </label>
          <input
            id="invite-email"
            data-cy="invite-email-input"
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={254}
            placeholder="teammate@company.com"
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-base text-neutral-900 dark:text-neutral-50 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:border-transparent transition-shadow"
          />

          <fieldset className="mt-3" aria-label="Relationship">
            <legend className="sr-only">How will they join?</legend>
            <div className="grid grid-cols-2 gap-2">
              <RelationshipChip
                value="REPORT"
                current={relationship}
                onChange={setRelationship}
                title="As a report"
                subtitle="You'll be their manager"
              />
              <RelationshipChip
                value="PEER"
                current={relationship}
                onChange={setRelationship}
                title="As a peer"
                subtitle="Same team, no manager link"
              />
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </p>
          )}
          {justSent && (
            <p
              role="status"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400"
            >
              <HiCheckCircle className="h-4 w-4" aria-hidden />
              Invitation sent to {justSent}
            </p>
          )}

          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              data-cy="send-invite-submit"
              disabled={!canSend}
              className={
                "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950 " +
                (canSend
                  ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 cursor-pointer"
                  : "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed")
              }
            >
              {sending ? "Sending…" : "Send invite"}
            </button>

            {/* The invite step is optional. "Send invite" stays disabled until
                a valid email is entered; the secondary action always lets the
                user into the app — "Skip for now" before any invite, "Done"
                once at least one is out. A solo user can start planning their
                own week without inviting anyone. */}
            <button
              type="button"
              data-cy={hasSentAtLeastOne ? "done-invites" : "skip-invites"}
              onClick={() => navigate("..", { relative: "path" })}
              className={
                hasSentAtLeastOne
                  ? "inline-flex items-center gap-1 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-4 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-neutral-950"
                  : "inline-flex items-center gap-1 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-50 transition-colors px-2 py-3"
              }
            >
              {hasSentAtLeastOne ? "Done" : "Skip for now"}
              <HiArrowRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </form>

        {invites && invites.length > 0 && (
          <PendingInvitesList invites={invites} />
        )}

        <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-500 leading-relaxed">
          You'll become a manager automatically once a report joins.
        </p>
      </div>
    </div>
  );
}

function RelationshipChip({
  value,
  current,
  onChange,
  title,
  subtitle,
}: {
  value: InvitationRelationship;
  current: InvitationRelationship;
  onChange: (v: InvitationRelationship) => void;
  title: string;
  subtitle: string;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      data-cy={`invite-relationship-${value.toLowerCase()}`}
      onClick={() => onChange(value)}
      aria-pressed={active}
      className={
        "rounded-lg border px-3 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white " +
        (active
          ? "border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-900"
          : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900")
      }
    >
      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-50">{title}</div>
      <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">{subtitle}</div>
    </button>
  );
}

function PendingInvitesList({ invites }: { invites: InvitationDto[] }) {
  return (
    <div className="mt-8 border-t border-neutral-200 dark:border-neutral-800 pt-6">
      <h2 className="text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-3">
        Invitations
      </h2>
      <ul className="space-y-2">
        {invites.map((inv) => (
          <InviteRow key={inv.id} invite={inv} />
        ))}
      </ul>
    </div>
  );
}

function InviteRow({ invite }: { invite: InvitationDto }) {
  const [copied, setCopied] = useState(false);
  const relationshipLabel = invite.relationship === "REPORT" ? "report" : "peer";
  const statusColor =
    invite.status === "ACCEPTED"
      ? "text-emerald-700 dark:text-emerald-400"
      : invite.status === "EXPIRED" || invite.status === "REVOKED"
      ? "text-neutral-500 dark:text-neutral-500"
      : "text-neutral-700 dark:text-neutral-300";

  async function copy() {
    try {
      await navigator.clipboard.writeText(invite.acceptUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — surface as a no-op rather than crash.
    }
  }

  return (
    <li className="rounded-md border border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm text-neutral-900 dark:text-neutral-50 truncate">
          {invite.email}
        </div>
        <div className="text-xs text-neutral-600 dark:text-neutral-400">
          {relationshipLabel} · <span className={statusColor}>{invite.status.toLowerCase()}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={copy}
        // Dense-control exception per spec §6.6 governance: this is the only
        // interactive element in the row, and adjacent rows are separated by
        // ≥24px of non-interactive content (email + status line). WCAG 2.2 AA
        // dense-control exception applies. Cypress 44×44 assertion skips this.
        data-dense-control="true"
        className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
        title="Copy invite link"
      >
        <HiOutlineClipboardCopy className="h-3.5 w-3.5" aria-hidden />
        {copied ? "Copied" : "Copy link"}
      </button>
    </li>
  );
}

