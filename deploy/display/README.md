# Display tab — GPU virtual monitor (Neko)

The **Display** tab streams one GPU-rendered desktop over WebRTC (1080p60, NVENC
H.264 on the RTX 4070 SUPER). First person to connect drives it; others watch and
can take over when it's released.

```
Browser ──WebRTC── Neko (:8080, Docker, GPU)      ← the pixels + input
   │
   └── /api/display/* (Next.js)                    ← the "who controls" lock
```

## One-time setup (needs sudo once)

```bash
sudo bash deploy/display/setup.sh
```

Installs Docker + the NVIDIA Container Toolkit, wires the GPU into Docker, and
starts Neko. After this it auto-starts on boot. Open the dashboard → **Display**.

> First run downloads a few GB (the Neko image). If the GPU isn't visible inside
> containers right after install, reboot once.

## Manage

```bash
docker compose -f deploy/display/docker-compose.yml ps
docker compose -f deploy/display/docker-compose.yml logs -f
docker compose -f deploy/display/docker-compose.yml restart
docker compose -f deploy/display/docker-compose.yml down
```

## Config (optional `deploy/display/.env`)

| Var | Default | Notes |
|-----|---------|-------|
| `SCREEN` | `1920x1080@60` | `WIDTHxHEIGHT@FPS` |
| `VIDEO_BITRATE` | `8000` | kbps (~8 Mbps) |
| `NEKO_USER_PASSWORD` | `neko` | **Must match** the dashboard's `NEXT_PUBLIC_PC_DISPLAY_PASSWORD` |
| `NEKO_IMAGE` | `nvidia-chromium` | GPU desktop image |

If you change `NEKO_USER_PASSWORD`, also set `NEXT_PUBLIC_PC_DISPLAY_PASSWORD` in
`frontend/.env` and rebuild the dashboard (`bash deploy/redeploy.sh`).

## How the lock works (no extra service)

The lock is implemented as Next.js API routes inside the dashboard, so there's
nothing extra to run:

- `GET  /api/display`           → status (empty/occupied, viewer count)
- `POST /api/display/claim`     → empty ⇒ controller, else viewer
- `POST /api/display/heartbeat` → keep seat; viewers can `upgrade` when seat frees
- `POST /api/display/release`   → free the seat (also on tab close)

Viewers get Neko's `cast=1` (view-only) embed URL; the controller doesn't.

## Notes

- The Display tab is **served over the same host/protocol** as the dashboard.
  If you later serve the dashboard over HTTPS, Neko must be reachable over the
  same scheme (put it behind your TLS proxy) to avoid mixed-content blocking.
- GPU images run a Chromium-based desktop. For a full XFCE desktop instead,
  set `NEKO_IMAGE=ghcr.io/m1k1o/neko/xfce:latest` (CPU encode — use `@30`).
