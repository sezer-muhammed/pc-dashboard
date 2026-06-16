"""Read-only system-metrics endpoints.

Authenticated (IsAuthenticated via project defaults). Each view delegates data
gathering to ``services`` and shapes the response with a serializer.
"""
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from apps.system import services
from apps.system.serializers import (
    DiskReportSerializer,
    NetworkInterfaceSerializer,
    SystemStatusSerializer,
)


class SystemStatusView(GenericAPIView):
    """GET /api/v1/system/status/ — host identity, CPU, memory, uptime."""

    serializer_class = SystemStatusSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(services.get_status())
        return Response(serializer.data)


class DiskView(GenericAPIView):
    """GET /api/v1/system/disk/ — per-partition usage + aggregate IO."""

    serializer_class = DiskReportSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        payload = {"partitions": services.get_disks(), "io": services.get_disk_io()}
        serializer = self.get_serializer(payload)
        return Response(serializer.data)


class NetworkView(GenericAPIView):
    """GET /api/v1/system/network/ — per-interface (ethernet) usage."""

    serializer_class = NetworkInterfaceSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(services.get_network(), many=True)
        return Response(serializer.data)
