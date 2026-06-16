"""URL routes for the audit log."""
from django.urls import path

from apps.audit.views import EventsView

app_name = "audit"

urlpatterns = [
    path("events/", EventsView.as_view(), name="events"),
]
