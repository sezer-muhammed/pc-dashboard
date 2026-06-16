"""URL routes for the file-transfer module."""
from django.urls import path

from apps.files.views import DownloadView, ListView, UploadView

app_name = "files"

urlpatterns = [
    path("list/", ListView.as_view(), name="list"),
    path("upload/", UploadView.as_view(), name="upload"),
    path("download/", DownloadView.as_view(), name="download"),
]
