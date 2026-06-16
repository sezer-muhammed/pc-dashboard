"""API v1 router.

Each feature module exposes its own ``urls.py`` and is mounted here under a
stable prefix. Add new modules (e.g. ``credentials/``, ``control/``) as the
backend grows.
"""
from django.urls import include, path

from apps.api.v1.views import api_root

urlpatterns = [
    path("", api_root, name="root"),
    path("system/", include("apps.system.urls")),
]
