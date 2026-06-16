"""Browse / upload / download files on the host.

Authenticated (IsAuthenticated). Like the Terminal and Storage Explorer this is
an operator tool, so it can reach any path the service user can read/write —
paths are resolved and errors handled, but not restricted to a sandbox root.
"""
import mimetypes
import os
from datetime import datetime, timezone
from pathlib import Path

from django.http import FileResponse
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.files.serializers import DirListingSerializer

TEXT_MAX_BYTES = 4 * 1024 * 1024  # only inline-edit files up to 4 MB


def _resolve(raw: str) -> Path:
    return Path(raw).expanduser().resolve()


class ListView(GenericAPIView):
    """GET /api/v1/files/list/?path=<dir> — directory listing (dirs first)."""

    serializer_class = DirListingSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        raw = request.query_params.get("path") or os.path.expanduser("~")
        directory = _resolve(raw)
        if not directory.exists():
            raise NotFound("Path not found.")
        if not directory.is_dir():
            raise ValidationError({"path": "Not a directory."})

        entries = []
        try:
            with os.scandir(directory) as it:
                for entry in it:
                    try:
                        is_dir = entry.is_dir(follow_symlinks=False)
                        st = entry.stat(follow_symlinks=False)
                        entries.append(
                            {
                                "name": entry.name,
                                "path": entry.path,
                                "is_dir": is_dir,
                                "size": None if is_dir else st.st_size,
                                "modified": datetime.fromtimestamp(st.st_mtime, tz=timezone.utc),
                            }
                        )
                    except OSError:
                        continue
        except PermissionError:
            raise ValidationError({"path": "Permission denied."})

        entries.sort(key=lambda e: (not e["is_dir"], e["name"].lower()))
        payload = {
            "path": str(directory),
            "parent": str(directory.parent) if directory != directory.parent else None,
            "entries": entries,
        }
        return Response(self.get_serializer(payload).data)


class UploadView(APIView):
    """POST /api/v1/files/upload/ — multipart: path=<dir>, file=<one or more>."""

    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request, *args, **kwargs) -> Response:
        target = request.data.get("path") or os.path.expanduser("~")
        directory = _resolve(target)
        if not directory.is_dir():
            raise ValidationError({"path": "Target is not a directory."})

        uploads = request.FILES.getlist("file")
        if not uploads:
            raise ValidationError({"file": "No file provided."})

        saved = []
        for upload in uploads:
            name = os.path.basename(upload.name)  # never trust client paths
            dest = directory / name
            try:
                with open(dest, "wb") as out:
                    for chunk in upload.chunks():
                        out.write(chunk)
            except (PermissionError, OSError) as exc:
                raise ValidationError({"file": f"{name}: {exc}"})
            saved.append({"name": name, "size": dest.stat().st_size})
        return Response({"path": str(directory), "saved": saved}, status=201)


class DownloadView(APIView):
    """GET /api/v1/files/download/?path=<file> — stream a file as attachment."""

    def get(self, request: Request, *args, **kwargs):
        raw = request.query_params.get("path")
        if not raw:
            raise ValidationError({"path": "Required."})
        target = _resolve(raw)
        if not target.exists() or not target.is_file():
            raise NotFound("File not found.")
        try:
            handle = open(target, "rb")
        except PermissionError:
            raise ValidationError({"path": "Permission denied."})
        return FileResponse(handle, as_attachment=True, filename=target.name)


class RawView(APIView):
    """GET /api/v1/files/raw/?path=<file> — serve a file inline (for previews)."""

    def get(self, request: Request, *args, **kwargs):
        raw = request.query_params.get("path")
        if not raw:
            raise ValidationError({"path": "Required."})
        target = _resolve(raw)
        if not target.exists() or not target.is_file():
            raise NotFound("File not found.")
        ctype = mimetypes.guess_type(target.name)[0] or "application/octet-stream"
        try:
            handle = open(target, "rb")
        except PermissionError:
            raise ValidationError({"path": "Permission denied."})
        return FileResponse(handle, content_type=ctype)  # inline (no attachment)


class ContentView(APIView):
    """GET /api/v1/files/content/?path=<file> — UTF-8 text content for editing.

    Returns text=null with a reason for binary or too-large files (use raw/
    or download/ for those).
    """

    def get(self, request: Request, *args, **kwargs) -> Response:
        raw = request.query_params.get("path")
        if not raw:
            raise ValidationError({"path": "Required."})
        target = _resolve(raw)
        if not target.exists() or not target.is_file():
            raise NotFound("File not found.")
        size = target.stat().st_size
        mime = mimetypes.guess_type(target.name)[0]
        base = {"path": str(target), "name": target.name, "size": size, "mime": mime}
        if size > TEXT_MAX_BYTES:
            return Response({**base, "text": None, "reason": "too_large"})
        try:
            data = target.read_bytes()
        except PermissionError:
            raise ValidationError({"path": "Permission denied."})
        try:
            return Response({**base, "text": data.decode("utf-8")})
        except UnicodeDecodeError:
            return Response({**base, "text": None, "reason": "binary"})


class SaveView(APIView):
    """POST /api/v1/files/save/ — write UTF-8 text to a file. {path, content}."""

    def post(self, request: Request, *args, **kwargs) -> Response:
        path = request.data.get("path")
        content = request.data.get("content")
        if not path:
            raise ValidationError({"path": "Required."})
        if content is None:
            raise ValidationError({"content": "Required."})
        target = _resolve(path)
        if target.exists() and not target.is_file():
            raise ValidationError({"path": "Not a file."})
        try:
            with open(target, "w", encoding="utf-8") as out:
                out.write(content)
        except (PermissionError, OSError) as exc:
            raise ValidationError({"path": str(exc)})
        return Response({"path": str(target), "size": target.stat().st_size})
