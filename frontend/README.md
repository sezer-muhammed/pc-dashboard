# sezer-pc-dashboard

Local web dashboard for **sezer-pc-backend**, built with Next.js 16 + React 19 +
Tailwind v4 in the Geist design language (matching `base-react-design-template`).

Two pages:
- **Overview** (`/`) — host identity, CPU / memory / swap metric cards, live CPU
  per-core, memory, GPU and network tables.
- **System Diagnostics** (`/diagnostics`) — full real-time telemetry: CPU,
  memory, temperature, GPU, disks (usage + IO throughput), network, and a
  directory-size **Storage Explorer**.

Everything is read live from the API and refreshes in place; nothing is stored.

## Run

The backend must be running first (from the repo root):

```bash
cd ..            # sezer-pc-backend
python manage.py runserver 127.0.0.1:8000
```

Then the dashboard:

```bash
npm install      # first time
npm run dev      # http://localhost:3000
```

Sign in with the backend superuser (`sezer`). Credentials are sent as HTTP Basic
and kept in `localStorage`.

## Configuration

The dashboard calls the backend directly (CORS is enabled server-side). Point it
at a different host with an env var:

```bash
NEXT_PUBLIC_PC_API=http://127.0.0.1:8000 npm run dev
```

The backend allows the dashboard origin via `DJANGO_CORS_ORIGINS`
(default `http://localhost:3000,http://127.0.0.1:3000`).

## Structure

```text
src/
├── app/
│   ├── layout.tsx          # Geist fonts + AuthGate + AppShell
│   ├── page.tsx            # Overview
│   └── diagnostics/page.tsx
├── components/
│   ├── ui/                 # Geist primitives (record-table, surface, badge, …)
│   ├── layout/app-shell.tsx
│   ├── auth/auth-gate.tsx  # Basic-auth login
│   └── dashboard/          # one panel per metric (cpu, memory, gpu, disk, …)
├── lib/                    # api client, polling hook, formatters, cn
└── types/system.ts         # API response types
```

Add a panel: drop a `*-panel.tsx` in `components/dashboard/`, wire its endpoint
with `usePoll`, render a `RecordTable`, and place it on a page.
