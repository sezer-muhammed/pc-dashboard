#!/usr/bin/env bash
# Install the backend + dashboard as always-on systemd *user* services.
#
# They auto-start on boot (linger), restart on crash, and run the dev servers
# (Django runserver + Next dev) which hot-reload on code changes.
#
#   bash deploy/install-services.sh
#
set -euo pipefail

UNIT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/systemd" && pwd)"
UNIT_DST="$HOME/.config/systemd/user"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

mkdir -p "$UNIT_DST"
cp "$UNIT_SRC/pc-dashboard.service" "$UNIT_DST/"
cp "$UNIT_SRC/pc-dashboard-frontend.service" "$UNIT_DST/"
cp "$UNIT_SRC/pc-dashboard-terminal.service" "$UNIT_DST/"

# Keep services running without an active login (survives logout/reboot).
loginctl enable-linger "$USER" 2>/dev/null || sudo loginctl enable-linger "$USER"

systemctl --user daemon-reload
systemctl --user enable --now pc-dashboard.service pc-dashboard-frontend.service pc-dashboard-terminal.service

echo "Installed. Status:"
systemctl --user --no-pager status pc-dashboard.service pc-dashboard-frontend.service | grep -E "Loaded|Active" || true
cat <<'EOF'

Backend : http://127.0.0.1:8000
Dashboard: http://127.0.0.1:3000

Manage:
  systemctl --user status  pc-dashboard-frontend.service
  systemctl --user restart pc-dashboard.service
  journalctl --user -u pc-dashboard.service -f
EOF
