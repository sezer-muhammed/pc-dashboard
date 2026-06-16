"""Top-level v1 views (discovery / index)."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.reverse import reverse


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request: Request, *args, **kwargs) -> Response:
    """Index of available v1 modules."""
    return Response(
        {
            "system": {
                "status": reverse("v1:system:status", request=request),
                "software": reverse("v1:system:software", request=request),
                "cpu": reverse("v1:system:cpu", request=request),
                "memory": reverse("v1:system:memory", request=request),
                "temperature": reverse("v1:system:temperature", request=request),
                "gpu": reverse("v1:system:gpu", request=request),
                "disk": reverse("v1:system:disk", request=request),
                "network": reverse("v1:system:network", request=request),
                "storage": reverse("v1:system:storage", request=request),
            },
            "files": {
                "list": reverse("v1:files:list", request=request),
                "upload": reverse("v1:files:upload", request=request),
                "download": reverse("v1:files:download", request=request),
            },
            "terminal": {
                "sessions": reverse("v1:terminal:sessions", request=request),
            },
        }
    )
