"""Turso (libSQL) Django backend package.

Compatibility shims for running django-libsql 0.1.3 (which targets Django <=5.0)
on Django 5.1+. Django removed ``Meta.index_together`` in 5.1, but
django-libsql's SQLite ``_remake_table`` still (a) reads
``Model._meta.index_together`` and (b) copies it into a dynamically built
``Meta``. No modern model uses it, so we:

1. expose an empty ``index_together`` on Options so the read succeeds, and
2. drop ``index_together`` from any incoming ``Meta`` before Django validates it.

Both are no-ops for real schemas.
"""
from django.db.models import options as _options


if not hasattr(_options.Options, "index_together"):
    _options.Options.index_together = frozenset()

if not getattr(_options.Options, "_turso_index_together_patch", False):
    _orig_contribute_to_class = _options.Options.contribute_to_class

    def _contribute_to_class(self, cls, name):
        meta = getattr(self, "meta", None)
        if meta is not None and "index_together" in getattr(meta, "__dict__", {}):
            try:
                delattr(meta, "index_together")
            except (AttributeError, TypeError):
                pass
        return _orig_contribute_to_class(self, cls, name)

    _options.Options.contribute_to_class = _contribute_to_class
    _options.Options._turso_index_together_patch = True
