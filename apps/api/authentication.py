"""Authentication that caches successful Basic-auth in memory.

The database is remote (Turso, us-east-1), so a DB user lookup on every request
adds ~1.5-2s of latency. The system endpoints touch no other tables, so once a
credential is validated we cache the user for a short TTL and skip the DB on
subsequent requests — turning repeat calls into pure-psutil (sub-second) work.

Only *successful* auth is cached, keyed by the exact Basic header, so a wrong
password still hits the normal validation path. Trade-off: a password change or
account deactivation takes up to TTL seconds to take effect. Fine for a
single-user personal tool.
"""
from __future__ import annotations

import threading
import time

from rest_framework.authentication import BasicAuthentication

_TTL_SECONDS = 60
_MAX_ENTRIES = 64
_cache: dict[str, tuple[object, float]] = {}
_lock = threading.Lock()


class CachedBasicAuthentication(BasicAuthentication):
    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith("Basic "):
            # Not Basic — defer to the next authenticator (returns None).
            return super().authenticate(request)

        now = time.monotonic()
        with _lock:
            entry = _cache.get(header)
            if entry is not None and entry[1] > now:
                return (entry[0], None)

        # Cache miss (or expired): validate against the DB. Wrong creds raise
        # AuthenticationFailed here and are never cached.
        result = super().authenticate(request)

        if result is not None:
            with _lock:
                _cache[header] = (result[0], now + _TTL_SECONDS)
                if len(_cache) > _MAX_ENTRIES:
                    for key in [k for k, v in _cache.items() if v[1] <= now]:
                        _cache.pop(key, None)
        return result
