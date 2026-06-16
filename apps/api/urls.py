"""API root — dispatches to versioned namespaces.

New API versions get their own package (e.g. ``apps/api/v2/``) and a line here.
"""
from django.urls import include, path

urlpatterns = [
    path("v1/", include(("apps.api.v1.urls", "v1"), namespace="v1")),
]
