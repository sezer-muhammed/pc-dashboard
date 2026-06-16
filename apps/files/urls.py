"""URL routes for the file-transfer module."""
from django.urls import path

from apps.files.views import (
    ContentView,
    DownloadView,
    ListView,
    RawView,
    SaveView,
    UploadView,
)

app_name = "files"

urlpatterns = [
    path("list/", ListView.as_view(), name="list"),
    path("upload/", UploadView.as_view(), name="upload"),
    path("download/", DownloadView.as_view(), name="download"),
    path("raw/", RawView.as_view(), name="raw"),
    path("content/", ContentView.as_view(), name="content"),
    path("save/", SaveView.as_view(), name="save"),
]
