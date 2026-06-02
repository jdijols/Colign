#!/usr/bin/env bash
# =====================================================================
# tools/design-loop/boot-stack.sh
#
# Boots backend (mock auth) + frontend remote + pa-host + Tailwind
# watcher inside a worktree. Idempotent — if a service is already up,
# leaves it alone.
#
# Usage: tools/design-loop/boot-stack.sh
#   Must be run from the worktree root.
#
# Writes PIDs to .design-loop-pids in the worktree for teardown.
# Also flips both .env.local files to mock mode (backup at .env.local.bak).
# =====================================================================

set -euo pipefail

WORKTREE_ROOT="$(pwd)"
PID_FILE="${WORKTREE_ROOT}/.design-loop-pids"
LOG_DIR="${WORKTREE_ROOT}/tmp/design-loop-logs"
mkdir -p "$LOG_DIR"

# Probe a port; treat 200/404/302 as "up" (any HTTP response).
is_up() {
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$1" 2>/dev/null || echo "000")
  [[ "$code" =~ ^(200|302|404)$ ]]
}

# Flip .env.local files to mock mode (with .bak for restore).
flip_env() {
  for f in "${WORKTREE_ROOT}/apps/colign-frontend/.env.local" "${WORKTREE_ROOT}/apps/pa-host/.env.local"; do
    if [ -f "$f" ] && grep -q 'VITE_AUTH_MODE=real' "$f"; then
      cp "$f" "${f}.bak"
      sed -i.tmp 's/VITE_AUTH_MODE=real/VITE_AUTH_MODE=mock/' "$f" && rm "${f}.tmp"
      echo "[boot] flipped $(basename "$(dirname "$f")")/.env.local → mock"
    fi
  done
}

# --- Flip env BEFORE booting vite, so vite reads mock at startup -----
flip_env

# --- Backend (port 8080, mock mode) ----------------------------------
if is_up 8080; then
  echo "[boot] backend already up on :8080"
else
  echo "[boot] starting backend (mock auth)..."
  (
    cd "${WORKTREE_ROOT}/apps/colign-backend"
    SPRING_PROFILES_ACTIVE=h2 COLIGN_AUTH_MODE=mock \
      JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
      PATH="/opt/homebrew/opt/openjdk@21/bin:/opt/homebrew/bin:$PATH" \
      ./mvnw spring-boot:run > "${LOG_DIR}/backend.log" 2>&1 &
    echo "backend=$!" >> "$PID_FILE"
  )
  # Wait up to 90s for backend (cold start can be slow)
  for i in {1..90}; do
    if is_up 8080; then echo "[boot] backend up (${i}s)"; break; fi
    sleep 1
  done
  is_up 8080 || { echo "[boot] backend FAILED to start; see ${LOG_DIR}/backend.log"; exit 1; }
fi

# --- Frontend remote (port 5174) -------------------------------------
if is_up 5174; then
  echo "[boot] remote already up on :5174"
else
  echo "[boot] starting frontend remote..."
  (
    cd "${WORKTREE_ROOT}/apps/colign-frontend"
    ./node_modules/.bin/vite --port 5174 > "${LOG_DIR}/remote.log" 2>&1 &
    echo "remote=$!" >> "$PID_FILE"
  )
  for i in {1..30}; do
    code=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:5174/remoteEntry.js 2>/dev/null || echo "000")
    if [ "$code" = "200" ]; then echo "[boot] remote up (${i}s)"; break; fi
    sleep 1
  done
fi

# --- pa-host (port 4173) ---------------------------------------------
if is_up 4173; then
  echo "[boot] host already up on :4173"
else
  echo "[boot] starting pa-host..."
  (
    cd "${WORKTREE_ROOT}/apps/pa-host"
    ./node_modules/.bin/vite --port 4173 > "${LOG_DIR}/host.log" 2>&1 &
    echo "host=$!" >> "$PID_FILE"
  )
  for i in {1..30}; do
    if is_up 4173; then echo "[boot] host up (${i}s)"; break; fi
    sleep 1
  done
fi

# --- Tailwind watcher (no port; PID tracking) ------------------------
# Per runbook gotcha #7: plain `yarn dev:css` self-exits without TTY.
# `tail -f /dev/null | tailwindcss --watch` holds stdin open.
if grep -q "^css=" "$PID_FILE" 2>/dev/null && kill -0 "$(grep '^css=' "$PID_FILE" | cut -d= -f2)" 2>/dev/null; then
  echo "[boot] css watcher already running"
else
  echo "[boot] starting Tailwind watcher..."
  (
    cd "${WORKTREE_ROOT}/apps/colign-frontend"
    tail -f /dev/null | ./node_modules/.bin/tailwindcss \
      -i src/index.css \
      -o src/colign-compiled.css \
      --watch > "${LOG_DIR}/css.log" 2>&1 &
    echo "css=$!" >> "$PID_FILE"
  )
  sleep 2
fi

# --- Cypress reporter symlinks (yarn-workspace hoisting gotcha) ------
# yarn hoists `cypress-multi-reporters` (and friends) to repo root, but
# Cypress's reporter loader doesn't walk up from apps/colign-frontend/.
# Without these symlinks, any Cypress invocation fails immediately.
CFE_NM="${WORKTREE_ROOT}/apps/colign-frontend/node_modules"
ROOT_NM="${WORKTREE_ROOT}/node_modules"
for pkg in cypress-multi-reporters mocha-junit-reporter mochawesome cypress-mochawesome-reporter; do
  if [ ! -e "$CFE_NM/$pkg" ] && [ -d "$ROOT_NM/$pkg" ]; then
    ln -sf "../../../node_modules/$pkg" "$CFE_NM/$pkg" && echo "[boot] linked $pkg into colign-frontend/node_modules"
  fi
done

echo "[boot] stack ready (backend :8080, remote :5174, host :4173, css watcher)"
