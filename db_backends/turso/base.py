"""Django database backend for Turso (libSQL) over the maintained Rust client.

Reuses django-libsql's ORM adaptations (operations / schema / introspection /
features — which already account for libSQL's lack of sqlite3 niceties like
``create_function``) but swaps the connection + cursor layer to
``libsql-experimental``, whose transport speaks Turso's current protocol.

settings.py:

    DATABASES = {
        "default": {
            "ENGINE": "db_backends.turso",
            "NAME": "libsql://<db>.turso.io",
            "OPTIONS": {"auth_token": "<token>"},
            # optional embedded replica:
            # "OPTIONS": {"auth_token": "...", "sync_url": "libsql://<db>.turso.io"},
        }
    }
"""
from __future__ import annotations

from collections.abc import Mapping

import libsql_experimental as libsql
from django.core.exceptions import ImproperlyConfigured
from libsql_client import dbapi2 as _dbapi2

from libsql.db.backends.libsql.base import FORMAT_QMARK_REGEX
from libsql.db.backends.libsql.base import DatabaseWrapper as _LibSQLDatabaseWrapper


class CursorWrapper:
    """Adapts a libsql-experimental cursor to what Django expects.

    Django emits "format"/"pyformat" placeholders; libSQL wants "qmark"/"named".
    This performs the same conversion django-libsql does, then delegates.
    """

    def __init__(self, cursor):
        self.cursor = cursor

    def execute(self, query, params=None):
        if params is None:
            return self.cursor.execute(query)
        query = self.convert_query(query, params)
        if isinstance(params, Mapping):
            return self.cursor.execute(query, params)
        return self.cursor.execute(query, tuple(params))

    def executemany(self, query, param_list):
        param_list = list(param_list)
        if not param_list:
            return None
        first = param_list[0]
        query = self.convert_query(query, first)
        if isinstance(first, Mapping):
            return self.cursor.executemany(query, param_list)
        return self.cursor.executemany(query, [tuple(p) for p in param_list])

    @staticmethod
    def convert_query(query, params):
        if isinstance(params, Mapping):
            return query % {name: f":{name}" for name in params}
        return FORMAT_QMARK_REGEX.sub("?", query).replace("%%", "%")

    def __getattr__(self, item):
        return getattr(self.cursor, item)

    def __iter__(self):
        return iter(self.cursor)

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        try:
            self.close()
        except Exception:
            pass


class DatabaseWrapper(_LibSQLDatabaseWrapper):
    # Exposes DBAPI exception classes + sqlite_version_info for Django.
    Database = _dbapi2

    def get_connection_params(self):
        settings_dict = self.settings_dict
        name = settings_dict["NAME"]
        if not name:
            raise ImproperlyConfigured(
                "settings.DATABASES['default']['NAME'] must be the libsql:// URL."
            )
        options = dict(settings_dict.get("OPTIONS") or {})
        params = {"database": name, "check_same_thread": False}
        auth_token = options.pop("auth_token", None) or settings_dict.get("AUTH_TOKEN")
        if auth_token:
            params["auth_token"] = auth_token
        sync_url = options.pop("sync_url", None)
        if sync_url:
            params["sync_url"] = sync_url
        params.update(options)
        return params

    def get_new_connection(self, conn_params):
        conn = libsql.connect(**conn_params)
        try:
            conn.execute("PRAGMA foreign_keys = ON")
        except Exception:
            pass
        return conn

    def create_cursor(self, name=None):
        return CursorWrapper(self.connection.cursor())

    def _set_autocommit(self, autocommit):
        with self.wrap_database_errors:
            self.connection.autocommit = bool(autocommit)
