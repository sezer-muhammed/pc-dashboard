# sezer-pc-backend

A private Django + Django REST Framework backend for monitoring and controlling
this PC over an HTTP API: track disk / ethernet usage, fetch credentials when
needed, and run host actions. Backed by a **Turso (libSQL)** database.

The codebase is intentionally module-based and conventional so new features drop
in as self-contained apps.

## Layout

```text
sezer-pc-backend/
├── manage.py
├── config/                  # project package
│   ├── settings.py          # env-driven settings (Turso DB, DRF, versioning)
│   ├── urls.py              # /admin, /api, /api-auth
│   ├── wsgi.py · asgi.py
├── apps/
│   ├── api/
│   │   ├── urls.py          # mounts versions
│   │   └── v1/
│   │       ├── urls.py      # v1 router → feature modules
│   │       └── views.py     # api_root index
│   └── system/              # feature module: host metrics
│       ├── services.py      # psutil data gathering (reusable, testable)
│       ├── serializers.py   # response shapes (status / disk / network)
│       ├── views.py         # GenericAPIView endpoints
│       ├── urls.py
│       └── models.py        # (no tables yet)
├── requirements.txt
├── .env.example             # template — copy to .env (gitignored)
└── README.md
```

### Adding a feature module

1. `mkdir apps/<name>` with `__init__.py`, `apps.py`, `serializers.py`, `views.py`, `urls.py`.
2. Add `"apps.<name>"` to `INSTALLED_APPS`.
3. Mount it in `apps/api/v1/urls.py`: `path("<name>/", include("apps.<name>.urls"))`.

Planned modules: `credentials/` (secret retrieval), `control/` (host actions).

## Setup

```bash
pip install -r requirements.txt
cp .env.example .env          # then fill in real values (already done locally)
python manage.py migrate      # creates Django's built-in tables on Turso
python manage.py createsuperuser
python manage.py runserver
```

## API

All endpoints are namespaced under `/api/v1/` and require authentication
(session or HTTP Basic). With the browsable API you can log in at `/api-auth/login/`.

All system endpoints are real-time and **not persisted** — every call reflects
the live host state.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/v1/` | Module index |
| GET | `/api/v1/system/status/` | Host identity, CPU, memory, uptime (overview) |
| GET | `/api/v1/system/cpu/` | Overall + per-core %, frequency, times. `?interval=` (0–2s, default 0.3) |
| GET | `/api/v1/system/memory/` | Virtual + swap memory |
| GET | `/api/v1/system/temperature/` | Sensor temperatures + fan speeds |
| GET | `/api/v1/system/gpu/` | NVIDIA GPU(s) via `nvidia-smi` (`available:false` if absent) |
| GET | `/api/v1/system/disk/` | Partitions + per-disk IO. `?interval=` (0–5s) adds throughput & utilisation % |
| GET | `/api/v1/system/network/` | Per-interface (ethernet) usage. `?interval=` (0–5s) adds bytes/sec |
| GET | `/api/v1/system/storage/` | Nested directory-size tree. `?path=<dir>` (default home), `?depth=` (1–4, default 2) |

Examples:

```bash
curl -u sezer:'<password>' http://127.0.0.1:8000/api/v1/system/cpu/?interval=0.5
curl -u sezer:'<password>' http://127.0.0.1:8000/api/v1/system/disk/?interval=1
curl -u sezer:'<password>' 'http://127.0.0.1:8000/api/v1/system/storage/?path=/home/sezer&depth=2'
```

The `storage` tree reports **recursive** folder sizes but only lists children
down to `depth` levels (largest-first), so the response stays bounded.

## Dashboard (web UI)

A local Next.js dashboard lives in [`frontend/`](frontend/) — an Overview page and
a System Diagnostics page that render this API's live metrics as Geist-styled
tables. CORS is enabled server-side (`DJANGO_CORS_ORIGINS`) so the dashboard can
call the API directly.

```bash
python manage.py runserver 127.0.0.1:8000   # terminal 1
cd frontend && npm install && npm run dev    # terminal 2 → http://localhost:3000
```

## Configuration

All config comes from environment variables loaded from `.env` (see
`.env.example`). If `TURSO_DATABASE_URL` is unset, the project falls back to a
local SQLite file so it stays runnable offline.

## Security notes

- `.env` holds the Turso token and Django secret key — it is git-ignored; never commit it.
- The API is authenticated and currently read-only. Credential-retrieval and
  host-control modules should add scoped permissions and token auth before use.
