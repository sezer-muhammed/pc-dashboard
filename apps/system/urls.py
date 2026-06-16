"""URL routes for the system module."""
from django.urls import path

from apps.system.views import DiskView, NetworkView, SystemStatusView

app_name = "system"

urlpatterns = [
    path("status/", SystemStatusView.as_view(), name="status"),
    path("disk/", DiskView.as_view(), name="disk"),
    path("network/", NetworkView.as_view(), name="network"),
]
