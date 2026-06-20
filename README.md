# PC Dashboard — self-hosted machine monitor & control

A small, self-hosted web app for watching and operating a single PC over HTTP.
It pairs a **Django REST Framework** API that reads live host metrics with a
**Next.js** dashboard, plus a browser terminal and file manager. Designed to run
on your own machine and be reached over LAN or a private mesh (e.g. Tailscale) —
**not** to be exposed to the public internet.

> Monorepo: the Django backend lives at the repository root, the dashboard lives
> in [`frontend/`](frontend/).
>
> 📖 **[Backend reference →](docs/backend.md)** · 🎨 **[Frontend guide →](frontend/README.md)**

## What you get

- **Live diagnostics** — CPU (per-core), GPU (NVIDIA via `nvidia-smi`), memory,
  disks, network throughput, temperatures/fans, and a host status summary, all
  read in real time with `psutil`. Nothing is persisted; every call reflects the
  current state.
- **Web terminal** — persistent named shell sessions in the browser (ttyd + tmux).
- **File manager** — browse, view/edit (CodeMirror), upload and download files.
- **Activity log** — an audit trail of actions taken through the API.

## Architecture

```text
        Browser (LAN / Tailscale)
                │
   ┌────────────┴─────────────┐
   │                          │
Next.js dashboard         ttyd web terminal
  :3000                     :7681  (tmux sessions)
   │
   │  HTTP Basic + CORS
   ▼
Django REST API  :8000  ── psutil · nvidia-smi · host filesystem
   │
   ▼
Turso (libSQL)  ── Django's built-in tables (admin, sessions). API auth itself
                   is validated in memory, not from the database. Falls back to
                   a local SQLite file when no Turso URL is configured.
```

## Repository layout

```text
.
├── manage.py              # Django entry point
├── config/                # settings (env-driven), root urls, wsgi/asgi
├── apps/                  # feature modules, each self-contained
│   ├── api/               # versioned API router (/api/v1/)
│   ├── system/            # host metrics (cpu/gpu/memory/disk/network/…)
│   ├── files/             # file browse / read / write / transfer
│   ├── terminal/          # tmux session management
│   └── audit/             # activity log
├── db_backends/turso/     # custom Django DB backend for Turso/libSQL
├── deploy/                # systemd user units + install/redeploy scripts
├── frontend/              # Next.js dashboard (see frontend/README.md)
├── requirements.txt
├── .env.example           # copy to .env (gitignored) and fill in
└── docs/backend.md        # full backend reference (endpoints, config, deploy)
```

## Quickstart

You need **Python 3.11+**, **Node 20+**, and optionally a (free) **Turso**
database — without one the backend falls back to a local SQLite file.

### 1. Backend — API on `:8000`

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then edit: secret key, API password, Turso URL/token
python manage.py migrate      # creates Django's tables
python manage.py runserver 0.0.0.0:8000
```

### 2. Frontend — dashboard on `:3000`

```bash
cd frontend
npm install
npm run dev                   # http://localhost:3000
```

The dashboard calls the API on the **same hostname** at port `8000` by default,
so it works over localhost, LAN, or Tailscale with no extra config. Override with
`NEXT_PUBLIC_PC_API` if your API lives elsewhere — see
[`frontend/README.md`](frontend/README.md).

## Security model

This app can read your filesystem, run shell commands, and report hardware state,
so treat access as equivalent to a login on the host.

- **Authentication** — every API call requires HTTP Basic credentials, checked in
  constant time against values from `.env` (`PC_API_USERNAME`/`PC_API_PASSWORD`,
  or `PC_API_USERS` for several accounts). Credentials are **not** stored in the
  database.
- **Secrets stay local** — `.env`, `*.key`, and `*.pem` are gitignored and never
  committed. Only `.env.example` (placeholders) is tracked.
- **Don't expose it publicly** — run it behind Tailscale / a VPN / LAN. Keep
  `DJANGO_DEBUG=false`, set a strong `DJANGO_SECRET_KEY`, and use a real password
  in production.

## Deployment

`deploy/` ships systemd **user** units for the three processes (backend, frontend,
web terminal):

```bash
bash deploy/install-services.sh     # install + enable + start the user services
bash deploy/redeploy.sh             # rebuild the dashboard and restart it after changes
```

The backend service uses `runserver` and auto-reloads on code change; the frontend
serves an optimised production build, so run `redeploy.sh` to ship UI changes.

## License

Released under the [MIT License](LICENSE).
