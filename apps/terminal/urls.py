"""URL routes for terminal-session management."""
from django.urls import path

from apps.terminal.views import SessionDetailView, SessionsView

app_name = "terminal"

urlpatterns = [
    path("sessions/", SessionsView.as_view(), name="sessions"),
    path("sessions/<str:name>/", SessionDetailView.as_view(), name="session-detail"),
]
