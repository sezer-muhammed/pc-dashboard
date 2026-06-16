"""
Django settings for the sezer-pc-backend project.

Configuration is read from environment variables (loaded from a local .env file
via python-dotenv). Never commit real secrets — see .env.example.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from the project root (no-op if the file is absent, e.g. in CI).
load_dotenv(BASE_DIR / ".env")


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    value = os.environ.get(key)
    return default if value is None else value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


# ─────────────────────────────────────────────────────────────────────────────
# Core
# ─────────────────────────────────────────────────────────────────────────────
SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-change-me")
DEBUG = env_bool("DJANGO_DEBUG", True)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "corsheaders",
    "rest_framework",
    # Local apps (module-based; add new feature modules here)
    "apps.system",
    "apps.files",
    "apps.terminal",
    "apps.audit",
]

# tmux binary used to manage the web-terminal sessions (same one ttyd runs).
PC_TMUX_BIN = env("PC_TMUX_BIN", os.path.expanduser("~/miniconda3/envs/shell/bin/tmux"))
# Shell command tmux runs for a new session — launches bash with the audit
# rcfile so commands are logged. {name} is the (sanitized) session name.
PC_TERMINAL_SHELL_CMD = env(
    "PC_TERMINAL_SHELL_CMD",
    "PCTERM_SESSION={name} exec bash --rcfile " + os.path.expanduser("~/.pcterm/bashrc"),
)

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# ─────────────────────────────────────────────────────────────────────────────
# Database — Turso (libSQL) via django-libsql.
# Falls back to a local SQLite file if TURSO_DATABASE_URL is not set, so the
# project stays runnable offline / in tests.
# ─────────────────────────────────────────────────────────────────────────────
TURSO_DATABASE_URL = env("TURSO_DATABASE_URL")
TURSO_AUTH_TOKEN = env("TURSO_AUTH_TOKEN")

if TURSO_DATABASE_URL:
    DATABASES = {
        "default": {
            "ENGINE": "db_backends.turso",
            "NAME": TURSO_DATABASE_URL,
            "OPTIONS": {"auth_token": TURSO_AUTH_TOKEN},
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Auth / passwords
# ─────────────────────────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# ─────────────────────────────────────────────────────────────────────────────
# Django REST Framework
# ─────────────────────────────────────────────────────────────────────────────
# CORS — the local dashboard (Next.js) calls this API cross-origin.
CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
# Allow the dashboard from any host on the dashboard port (localhost, LAN,
# Tailscale, …) — it's served on :3000 wherever the PC is reached.
CORS_ALLOWED_ORIGIN_REGEXES = [r"^https?://[\w.\-]+:3000$"]
CORS_ALLOW_HEADERS = ["authorization", "content-type", "accept", "origin", "x-requested-with"]


# API credentials checked in-memory (no DB) by StaticCredentialAuthentication.
# Defaults to the admin login; override in .env.
PC_API_USERNAME = env("PC_API_USERNAME", "sezer")
PC_API_PASSWORD = env("PC_API_PASSWORD")


def _build_api_users() -> dict[str, str]:
    """Allowed dashboard logins. PC_API_USERS="user:pass,user:pass" (so the audit
    log can attribute actions to a person); falls back to the single
    PC_API_USERNAME/PC_API_PASSWORD."""
    users: dict[str, str] = {}
    for pair in env("PC_API_USERS", "").split(","):
        if ":" in pair:
            u, p = pair.split(":", 1)
            if u.strip() and p.strip():
                users[u.strip()] = p.strip()
    if not users and PC_API_PASSWORD:
        users[PC_API_USERNAME] = PC_API_PASSWORD
    return users


PC_API_USERS = _build_api_users()

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # Static-credential Basic auth — validated against env, never the DB,
        # so the read-only system endpoints make zero database queries.
        "apps.api.authentication.StaticCredentialAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
    "DEFAULT_VERSIONING_CLASS": "rest_framework.versioning.URLPathVersioning",
    "DEFAULT_VERSION": "v1",
    "ALLOWED_VERSIONS": ["v1"],
}


# ─────────────────────────────────────────────────────────────────────────────
# I18N / static
# ─────────────────────────────────────────────────────────────────────────────
LANGUAGE_CODE = "en-us"
TIME_ZONE = env("DJANGO_TIME_ZONE", "Europe/Istanbul")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
