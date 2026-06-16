"""Root URL configuration.

All application endpoints live under the versioned API namespace in
``apps.api``. The admin site is kept separate.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.api.urls")),
    # DRF browsable-API login/logout
    path("api-auth/", include("rest_framework.urls")),
]
