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
                "disk": reverse("v1:system:disk", request=request),
                "network": reverse("v1:system:network", request=request),
            },
        }
    )
