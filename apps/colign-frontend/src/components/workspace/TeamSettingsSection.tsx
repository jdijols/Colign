import { useEffect, useState } from "react";
import { useGetTeamQuery, useUpdateTeamMutation } from "@/api/team";

interface Props {
  teamId: number;
  canManage: boolean;
}

export function TeamSettingsSection({ teamId, canManage }: Props) {
  const { data: team, isLoading } = useGetTeamQuery({ teamId });
  const [updateTeam, { isLoading: saving }] = useUpdateTeamMutation();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description ?? "");
      setAvatarUrl(team.avatarUrl ?? "");
    }
  }, [team]);

  if (isLoading) {
    return <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading team…</p>;
  }
  if (!team) return null;

  async function save() {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Team name can't be empty.");
      return;
    }
    try {
      await updateTeam({
        teamId,
        body: {
          name: trimmedName,
          description: description.trim() || undefined,
          avatarUrl: avatarUrl.trim() || undefined,
        },
      }).unwrap();
      setSavedAt(Date.now());
    } catch (err) {
      const status = (err as { status?: number })?.status;
      setError(
        status === 403 ? "You don't have permission to update this team."
          : status === 409 ? "Someone else updated this team — refresh and try again."
          : "Could not save changes."
      );
    }
  }

  const dirty =
    name.trim() !== team.name ||
    (description.trim() || null) !== (team.description ?? null) ||
    (avatarUrl.trim() || null) !== (team.avatarUrl ?? null);

  return (
    <div className="space-y-4">
      {!canManage && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2">
          Only managers can edit team details.
        </p>
      )}
      <div>
        <label htmlFor="team-name" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
          Team name
        </label>
        <input
          id="team-name"
          data-cy="team-name-input"
          type="text"
          value={name}
          maxLength={120}
          disabled={!canManage}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-500"
        />
      </div>
      <div>
        <label htmlFor="team-description" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
          Description
        </label>
        <textarea
          id="team-description"
          data-cy="team-description-input"
          value={description}
          maxLength={2000}
          rows={3}
          disabled={!canManage}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-500"
        />
      </div>
      <div>
        <label htmlFor="team-avatar-url" className="block text-sm font-medium text-neutral-900 dark:text-neutral-50 mb-1">
          Avatar URL
        </label>
        <input
          id="team-avatar-url"
          data-cy="team-avatar-input"
          type="url"
          value={avatarUrl}
          maxLength={500}
          disabled={!canManage}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-neutral-900 dark:text-neutral-50 disabled:bg-neutral-100 dark:disabled:bg-neutral-900 disabled:text-neutral-500"
        />
        {avatarUrl && (
          <div className="mt-2 flex items-center gap-2">
            <img
              src={avatarUrl}
              alt="Team avatar preview"
              className="h-10 w-10 rounded object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-xs text-neutral-500">Preview</span>
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-400">{error}</p>}
      {savedAt && !error && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">Saved.</p>
      )}
      <button
        type="button"
        data-cy="team-save"
        onClick={save}
        disabled={!canManage || !dirty || saving}
        className="rounded-lg bg-neutral-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-neutral-900 disabled:bg-neutral-200 dark:disabled:bg-neutral-800 disabled:text-neutral-500 dark:disabled:text-neutral-600 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
