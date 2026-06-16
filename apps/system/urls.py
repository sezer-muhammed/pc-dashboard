"""URL routes for the system module."""
from django.urls import path

from apps.system.views import (
    CpuView,
    DiskView,
    GpuView,
    MemoryView,
    NetworkView,
    SoftwareView,
    StorageView,
    SystemStatusView,
    TemperatureView,
)

app_name = "system"

urlpatterns = [
    path("status/", SystemStatusView.as_view(), name="status"),
    path("software/", SoftwareView.as_view(), name="software"),
    path("cpu/", CpuView.as_view(), name="cpu"),
    path("memory/", MemoryView.as_view(), name="memory"),
    path("temperature/", TemperatureView.as_view(), name="temperature"),
    path("gpu/", GpuView.as_view(), name="gpu"),
    path("disk/", DiskView.as_view(), name="disk"),
    path("network/", NetworkView.as_view(), name="network"),
    path("storage/", StorageView.as_view(), name="storage"),
]
