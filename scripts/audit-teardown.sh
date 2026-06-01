#!/usr/bin/env bash
# scripts/audit-teardown.sh — implements spec §6.3 mechanical env restore.
#
# Usage:
#   trap 'scripts/audit-teardown.sh restore' EXIT INT TERM   # MUST be registered
#   scripts/audit-teardown.sh flip
#   # ... audit work ...
#   scripts/audit-teardown.sh restore   # also runs via trap on early exit

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SNAPSHOT_DIR="$REPO_ROOT/.audit-snapshot"
FRONTEND_ENV="$REPO_ROOT/apps/colign-frontend/.env.local"
BACKEND_ENV="$REPO_ROOT/apps/colign-backend/.env.local"
# pa-host has its own VITE_AUTH_MODE that drives RootGate's HostHome vs
# WeeklyCommitApp choice at /. Without flipping this too, Cypress runs
# get bounced to real Auth0 from the landing CTA.
HOST_ENV="$REPO_ROOT/apps/pa-host/.env.local"

# Append-or-replace a KEY=VALUE line in a .env file.
# Avoids the sed-only-replaces footgun when KEY is absent.
set_env_var() {
  local file="$1"
  local key="$2"
  local value="$3"
  if [ ! -f "$file" ]; then
    echo "WARNING: $file does not exist; skipping $key flip"
    return 0
  fi
  if grep -q "^${key}=" "$file"; then
    # Replace in place. The sed -i.bak portable workaround keeps macOS + GNU consistent.
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file"
    rm -f "$file.bak"
    echo "  ✓ $key replaced in $(basename "$(dirname "$file")")/.env.local"
  else
    # Ensure newline before append (some files don't end with one).
    if [ -s "$file" ] && [ "$(tail -c 1 "$file")" != "" ]; then
      printf "\n" >> "$file"
    fi
    echo "${key}=${value}" >> "$file"
    echo "  ✓ $key appended to $(basename "$(dirname "$file")")/.env.local"
  fi
}

cmd_flip() {
  if [ -d "$SNAPSHOT_DIR" ]; then
    echo "ERROR: $SNAPSHOT_DIR already exists. Run 'restore' or remove it manually." >&2
    exit 1
  fi
  mkdir -p "$SNAPSHOT_DIR"
  [ -f "$FRONTEND_ENV" ] && cp "$FRONTEND_ENV" "$SNAPSHOT_DIR/frontend.env.local"
  [ -f "$BACKEND_ENV" ] && cp "$BACKEND_ENV" "$SNAPSHOT_DIR/backend.env.local"
  [ -f "$HOST_ENV" ]    && cp "$HOST_ENV"    "$SNAPSHOT_DIR/host.env.local"
  echo "Snapshot stored at $SNAPSHOT_DIR — DO NOT delete until 'restore' runs."
  echo "Flipping to mock auth mode..."
  set_env_var "$FRONTEND_ENV" "VITE_AUTH_MODE" "mock"
  set_env_var "$BACKEND_ENV" "COLIGN_AUTH_MODE" "mock"
  set_env_var "$HOST_ENV"    "VITE_AUTH_MODE" "mock"
  echo "✓ Flipped. Register the trap NOW if you haven't:"
  echo "    trap 'scripts/audit-teardown.sh restore' EXIT INT TERM"
}

cmd_restore() {
  if [ ! -d "$SNAPSHOT_DIR" ]; then
    echo "No snapshot at $SNAPSHOT_DIR — nothing to restore."
    return 0
  fi
  [ -f "$SNAPSHOT_DIR/frontend.env.local" ] && cp "$SNAPSHOT_DIR/frontend.env.local" "$FRONTEND_ENV" && echo "  ✓ Frontend env restored"
  [ -f "$SNAPSHOT_DIR/backend.env.local" ]  && cp "$SNAPSHOT_DIR/backend.env.local"  "$BACKEND_ENV"  && echo "  ✓ Backend env restored"
  [ -f "$SNAPSHOT_DIR/host.env.local" ]     && cp "$SNAPSHOT_DIR/host.env.local"     "$HOST_ENV"     && echo "  ✓ Host env restored"
  rm -rf "$SNAPSHOT_DIR"
  echo "✓ Snapshot removed. Auth mode restored."
}

case "${1:-}" in
  flip) cmd_flip ;;
  restore) cmd_restore ;;
  *) echo "Usage: $0 {flip|restore}"; exit 64 ;;
esac
