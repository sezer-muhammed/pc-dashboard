# Backend reference

The backend is a **Django + Django REST Framework** project rooted at the
repository top level. It exposes a versioned, authenticated HTTP API that reads
live host state (`psutil`, `nvidia-smi`), manages files and tmux sessions, and
records an activity log. It is intentionally module-based: each feature is a
self-contained Django app under `apps/`, mounted under `/api/v1/`.

- **Stack:** Python 3.11+, Django 5.1, DRF 3.15, `psutil`, Turso/libSQL.
- **Auth:** HTTP Basic (or session for the browsable API), validated in memory.
- **Persistence:** only Django's built-in tables (admin/sessions) hit the
  database; metrics are computed on every request and never stored.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # fill in the values below
python manage.py migrate
python manage.py createsuperuser   # optional — for /admin and the browsable API
python manage.py runserver 0.0.0.0:8000
```

If `TURSO_DATABASE_URL` is unset the project falls back to a local SQLite file,
so it stays runnable fully offline.

## Configuration

All configuration comes from environment variables, loaded from `.env` (see
`.env.example`). Nothing sensitive is committed.

| Variable | Default | Purpose |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | `django-insecure-change-me` | Django secret. Set a long random value in production. |
| `DJANGO_DEBUG` | `true` | Debug mode. Set `false` in production. |
| `DJANGO_ALLOWED_HOSTS` | `127.0.0.1,localhost` | Comma-separated allowed hosts. |
| `DJANGO_TIME_ZONE` | `Europe/Istanbul` | Server time zone. |
| `DJANGO_CORS_ORIGINS` | localhost:3000 origins | Comma-separated origins allowed to call the API. |
| `PC_API_USERNAME` | `admin` | API username (single-user mode). |
| `PC_API_PASSWORD` | _(none)_ | API password. **Required** — set a strong one. |
| `PC_API_USERS` | _(empty)_ | Multi-user form: `user:pass,user2:pass2` (overrides the single pair). |
| `TURSO_DATABASE_URL` | _(none)_ | `libsql://<db>.turso.io`. Unset ⇒ local SQLite fallback. |
| `TURSO_AUTH_TOKEN` | _(none)_ | Turso database token. |
| `PC_TMUX_BIN` | `~/miniconda3/envs/shell/bin/tmux` | Path to the `tmux` binary used by the terminal module. |
| `PC_TERMINAL_SHELL_CMD` | shell command | Command used to launch terminal sessions. |

Get Turso credentials with `turso db show <db>` and `turso db tokens create <db>`.

## Authentication

Every `/api/v1/` endpoint requires credentials. With `curl`, use HTTP Basic:

```bash
curl -u "$PC_API_USERNAME:$PC_API_PASSWORD" http://127.0.0.1:8000/api/v1/system/cpu/
```

Credentials are compared in constant time against `.env` values — they are not
read from the database, so the Turso DB only backs Django's admin/session tables.
The browsable API is available in a browser; log in at `/api-auth/login/`.

## API

All endpoints are namespaced under `/api/v1/`. System endpoints are real-time and
**not persisted** — every call reflects the live host state.

### System — `/api/v1/system/`

| Method | Path | Description |
| --- | --- | --- |
| GET | `status/` | Host identity, CPU, memory, uptime (overview) |
| GET | `software/` | Versions of key host software |
| GET | `cpu/` | Overall + per-core %, frequency, times. `?interval=` (0–2s, default 0.3) |
| GET | `memory/` | Virtual + swap memory (incl. cached/buffers/shared/active, swap in/out) |
| GET | `temperature/` | Sensor temperatures + fan speeds |
| GET | `gpu/` | NVIDIA GPU(s) via `nvidia-smi` (`available:false` if absent) |
| GET | `disk/` | Partitions + per-disk IO. `?interval=` (0–5s) adds throughput & utilisation % |
| GET | `network/` | Per-interface usage. `?interval=` (0–5s) adds bytes/sec |
| GET | `storage/` | Nested directory-size tree. `?path=<dir>` (default home), `?depth=` (1–4, default 2) |

### Files — `/api/v1/files/`

| Method | Path | Description |
| --- | --- | --- |
| GET | `list/` | List a directory |
| GET | `content/` · `raw/` | Read a file (JSON / raw bytes) |
| POST | `save/` | Write file contents |
| POST | `upload/` | Upload a file |
| GET | `download/` | Download a file |

### Terminal — `/api/v1/terminal/`

| Method | Path | Description |
| --- | --- | --- |
| GET/POST | `sessions/` | List or create tmux sessions |
| GET/DELETE | `sessions/<name>/` | Inspect or kill a session |

### Audit — `/api/v1/audit/`

| Method | Path | Description |
| --- | --- | --- |
| GET | `events/` | Activity log of actions taken through the API |

### Examples

```bash
curl -u admin:'<password>' http://127.0.0.1:8000/api/v1/system/cpu/?interval=0.5
curl -u admin:'<password>' http://127.0.0.1:8000/api/v1/system/disk/?interval=1
curl -u admin:'<password>' 'http://127.0.0.1:8000/api/v1/system/storage/?path=/home/user&depth=2'
```

The `storage` tree reports **recursive** folder sizes but only lists children down
to `depth` levels (largest-first), so the response stays bounded.

## Project layout

```text
manage.py
config/
  settings.py     # env-driven settings (DB, DRF, CORS, versioning)
  urls.py         # /admin, /api, /api-auth
  wsgi.py · asgi.py
apps/
  api/            # versioned router → mounts feature modules under /api/v1/
  system/         # services.py (psutil gathering) · serializers · views · urls
  files/  terminal/  audit/
db_backends/turso/  # custom Django DB backend (libsql-experimental)
```

## Adding a feature module

1. `mkdir apps/<name>` with `__init__.py`, `apps.py`, `serializers.py`,
   `views.py`, `urls.py`.
2. Add `"apps.<name>"` to `INSTALLED_APPS` in `config/settings.py`.
3. Mount it in `apps/api/v1/urls.py`:
   `path("<name>/", include("apps.<name>.urls"))`.

Each module keeps data-gathering logic in a reusable, testable `services.py`,
response shapes in `serializers.py`, and thin DRF `GenericAPIView` endpoints.

## Turso / libSQL backend

`db_backends/turso/` is a thin Django database backend over
`libsql-experimental`, with schema adaptations from `django-libsql`. It lets
Django run its ORM and migrations against a remote Turso database. Configure it
via `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`; leave them unset to use the local
SQLite fallback during development.

## Deployment

See [`../deploy/`](../deploy/) for systemd **user** units. The backend unit runs
`manage.py runserver` and auto-reloads on code changes, so backend edits need no
redeploy. (`deploy/redeploy.sh` rebuilds and restarts the **frontend**, which
serves an optimised production build.)
