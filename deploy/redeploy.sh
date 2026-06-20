#!/usr/bin/env bash
# Rebuild the dashboard and restart it after code changes.
#
# The frontend service serves an optimised production build (next start), so it
# does NOT hot-reload — run this to ship changes:
#
#   bash deploy/redeploy.sh
#
# The backend service uses Django runserver and DOES auto-reload, so it needs no
# redeploy (pass --backend to restart it too).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export PATH="$HOME/.local/node/bin:$PATH"

echo "[1/2] Building dashboard (next build)…"
cd "$REPO/frontend"
npm run build

echo "[2/2] Restarting frontend service…"
systemctl --user restart pc-dashboard-frontend.service

if [ "${1:-}" = "--backend" ]; then
  systemctl --user restart pc-dashboard.service
  echo "Restarted backend too."
fi

systemctl --user --no-pager --property=ActiveState,SubState show pc-dashboard-frontend.service | tr '\n' ' '
echo
echo "Done → dashboard on :3000"
