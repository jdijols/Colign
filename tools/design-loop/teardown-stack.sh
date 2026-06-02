#!/usr/bin/env bash
# =====================================================================
# tools/design-loop/teardown-stack.sh
#
# Kills processes whose PIDs are recorded in .design-loop-pids and
# restores .env.local files from .bak.
#
# Usage: tools/design-loop/teardown-stack.sh
#   Must be run from the worktree root.
# =====================================================================

set -uo pipefail

WORKTREE_ROOT="$(pwd)"
PID_FILE="${WORKTREE_ROOT}/.design-loop-pids"

# --- Kill recorded PIDs ----------------------------------------------
if [ -f "$PID_FILE" ]; then
  while IFS='=' read -r name pid; do
    [ -z "${pid:-}" ] && continue
    if kill -0 "$pid" 2>/dev/null; then
      echo "[teardown] killing $name (pid=$pid)"
      kill "$pid" 2>/dev/null || true
      # Give it 2s to exit gracefully, then SIGKILL
      for _ in 1 2; do
        sleep 1
        kill -0 "$pid" 2>/dev/null || break
      done
      kill -9 "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# --- Belt-and-suspenders: kill anything still on our ports -----------
# (mvnw spring-boot:run often spawns a java child that escapes the kill above)
for port in 8080 5174 4173; do
  pid=$(lsof -ti:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "[teardown] killing orphan on :$port (pid=$pid)"
    kill "$pid" 2>/dev/null || true
    sleep 1
    kill -9 "$pid" 2>/dev/null || true
  fi
done

# --- Restore env files from .bak -------------------------------------
for f in "${WORKTREE_ROOT}/apps/colign-frontend/.env.local" "${WORKTREE_ROOT}/apps/pa-host/.env.local"; do
  if [ -f "${f}.bak" ]; then
    mv "${f}.bak" "$f"
    echo "[teardown] restored $(basename "$(dirname "$f")")/.env.local"
  fi
done

echo "[teardown] stack torn down"
