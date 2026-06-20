#!/usr/bin/env bash
# One-time setup for the Display tab's GPU stream (Neko).
# Installs Docker + the NVIDIA Container Toolkit, then launches Neko.
#
# Run ONCE with sudo:
#   sudo bash deploy/display/setup.sh
#
# After this, Neko auto-starts on boot (Docker `restart: unless-stopped`) and the
# dashboard's /display tab will work. To manage later:
#   docker compose -f deploy/display/docker-compose.yml {ps,logs -f,restart,down}
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run with sudo:  sudo bash deploy/display/setup.sh" >&2
  exit 1
fi

REAL_USER="${SUDO_USER:-$USER}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> [1/5] Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "    docker already present: $(docker --version)"
fi

echo "==> [2/5] Installing NVIDIA Container Toolkit"
if ! command -v nvidia-ctk >/dev/null 2>&1; then
  curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
  curl -fsSL https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list \
    | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' \
    > /etc/apt/sources.list.d/nvidia-container-toolkit.list
  apt-get update -y
  apt-get install -y nvidia-container-toolkit
else
  echo "    nvidia-ctk already present"
fi

echo "==> [3/5] Wiring NVIDIA runtime into Docker + enabling on boot"
nvidia-ctk runtime configure --runtime=docker
systemctl enable --now docker
systemctl restart docker

echo "==> [4/5] Letting '$REAL_USER' use docker without sudo (effective next login)"
groupadd -f docker
usermod -aG docker "$REAL_USER"

echo "==> [5/5] Pulling + starting Neko (this downloads a few GB the first time)"
cd "$HERE"
docker run --rm --gpus all nvidia/cuda:12.4.0-base-ubuntu22.04 nvidia-smi >/dev/null 2>&1 \
  && echo "    GPU visible inside containers ✓" \
  || echo "    WARNING: GPU not visible in containers yet — a reboot may be needed."
docker compose up -d

echo
echo "Done. Neko is on http://localhost:8080 and the /display tab will use it."
echo "Logs:    docker compose -f deploy/display/docker-compose.yml logs -f"
echo "Status:  docker compose -f deploy/display/docker-compose.yml ps"
