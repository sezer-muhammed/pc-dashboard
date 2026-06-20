# Dashboard (frontend)

The web UI for the [PC Dashboard](../README.md) — a [Next.js](https://nextjs.org)
app (App Router, React 19, Tailwind v4) in the Geist design language. It renders
the backend's live metrics and provides a browser terminal and file manager.
Charts use [Recharts](https://recharts.org).

Everything is read live from the API and refreshes in place; nothing is stored.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Overview — host identity, CPU/memory metric cards, headline tables |
| `/diagnostics` | Live diagnostics — CPU, GPU, memory, temperature, disk (usage + IO), network, and a directory-size Storage Explorer |
| `/terminal` | Browser terminal (embeds the ttyd web terminal) |
| `/files` | File browser, viewer/editor (CodeMirror), upload/download |
| `/activity` | Activity log from the audit API |

The diagnostics panels poll the API on a shared refresh interval. The GPU panel
samples every 2s while the tab is visible and draws a 60-second history with
Recharts; the CPU, memory and temperature panels render compact live snapshots.

## Run

The backend must be running first (from the repo root):

```bash
cd ..            # repository root
python manage.py runserver 0.0.0.0:8000
```

Then the dashboard:

```bash
npm install      # first time
npm run dev      # http://localhost:3000
```

Sign in with the API credentials (`PC_API_USERNAME` / `PC_API_PASSWORD` from the
backend `.env`). They are sent as HTTP Basic and kept in `localStorage`.

## Configuration

By default the dashboard talks to the API on the **same hostname** it is served
from, port 8000 — so localhost, LAN, and Tailscale all work with no config. Create
`.env.local` (gitignored) to override:

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_PC_API` | `http://<same-host>:8000` | Full API base URL — set this to point at a different host/port. |
| `NEXT_PUBLIC_PC_API_PORT` | `8000` | API port when deriving the base from the current host. |
| `NEXT_PUBLIC_PC_TERMINAL_PORT` | `7681` | Port of the ttyd web terminal embedded on `/terminal`. |

The backend allows the dashboard origin via `DJANGO_CORS_ORIGINS` (default
`http://localhost:3000,http://127.0.0.1:3000`).

## Build & deploy

```bash
npm run build      # optimised production build
npm run start      # serve the production build (next start)
```

In the systemd setup the frontend service serves the production build, so UI
changes require a rebuild + restart — from the repo root: `bash deploy/redeploy.sh`.

## Structure

```text
src/
├── app/                    # routes: /, diagnostics, terminal, files, activity
│   └── layout.tsx          # Geist fonts + AuthGate + AppShell
├── components/
│   ├── ui/                 # Geist primitives (record-table, surface, badge, progress-cell, …)
│   ├── layout/             # app shell
│   ├── auth/               # Basic-auth login gate
│   └── dashboard/          # one panel per metric (cpu, memory, gpu, temperature, disk, …)
├── lib/                    # api client, polling hook, formatters, cn
└── types/system.ts         # API response types (mirror the backend serializers)
```

Add a panel: drop a `*-panel.tsx` in `components/dashboard/`, wire its endpoint
with `usePoll`, render the data (a `RecordTable` for tabular data, or a compact
card for a small fixed metric set), and place it on a page.

## Stack

Next.js 16 · React 19 · Tailwind CSS v4 · Recharts · CodeMirror
(`@uiw/react-codemirror`) · lucide-react icons.
