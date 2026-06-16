"""Read-only, real-time system-information endpoints.

Authenticated (IsAuthenticated via project defaults). Each view delegates data
gathering to ``services`` and shapes the response with a serializer. Nothing is
persisted — every call reflects the live host state.
"""
import os

from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.system import services
from apps.system.serializers import (
    CpuSerializer,
    DiskReportSerializer,
    GpuReportSerializer,
    MemorySerializer,
    NetworkInterfaceSerializer,
    StorageTreeSerializer,
    SystemStatusSerializer,
    TemperatureReportSerializer,
)


def _float_param(request: Request, name: str, default: float, lo: float, hi: float) -> float:
    raw = request.query_params.get(name)
    if raw is None or raw == "":
        return default
    try:
        return max(lo, min(hi, float(raw)))
    except (TypeError, ValueError):
        raise ValidationError({name: "must be a number"})


def _int_param(request: Request, name: str, default: int, lo: int, hi: int) -> int:
    raw = request.query_params.get(name)
    if raw is None or raw == "":
        return default
    try:
        return max(lo, min(hi, int(raw)))
    except (TypeError, ValueError):
        raise ValidationError({name: "must be an integer"})


class SystemStatusView(GenericAPIView):
    """GET /api/v1/system/status/ — host identity, CPU, memory, uptime."""

    serializer_class = SystemStatusSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        return Response(self.get_serializer(services.get_status()).data)


class CpuView(GenericAPIView):
    """GET /api/v1/system/cpu/ — overall + per-core usage, frequency, times.

    Query: ?interval=<seconds 0..2> sampling window for utilisation (default 0.3).
    """

    serializer_class = CpuSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        interval = _float_param(request, "interval", 0.3, 0.0, 2.0)
        return Response(self.get_serializer(services.get_cpu(interval=interval)).data)


class MemoryView(GenericAPIView):
    """GET /api/v1/system/memory/ — virtual + swap memory."""

    serializer_class = MemorySerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        return Response(self.get_serializer(services.get_memory()).data)


class TemperatureView(GenericAPIView):
    """GET /api/v1/system/temperature/ — sensor temperatures + fan speeds."""

    serializer_class = TemperatureReportSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        return Response(self.get_serializer(services.get_temperatures()).data)


class GpuView(GenericAPIView):
    """GET /api/v1/system/gpu/ — NVIDIA GPU(s) via nvidia-smi."""

    serializer_class = GpuReportSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        return Response(self.get_serializer(services.get_gpu()).data)


class SoftwareView(APIView):
    """GET /api/v1/system/software/ — versions of key software (cached)."""

    def get(self, request: Request, *args, **kwargs) -> Response:
        return Response(services.get_software())


class DiskView(GenericAPIView):
    """GET /api/v1/system/disk/ — partitions + per-disk IO.

    Query: ?interval=<seconds 0..5> to add throughput (bytes/sec) and
    utilisation %. Default 0 (cumulative counters only).
    """

    serializer_class = DiskReportSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        interval = _float_param(request, "interval", 0.0, 0.0, 5.0)
        payload = {"partitions": services.get_disks(), "io": services.get_disk_io(interval=interval)}
        return Response(self.get_serializer(payload).data)


class NetworkView(GenericAPIView):
    """GET /api/v1/system/network/ — per-interface (ethernet) usage.

    Query: ?interval=<seconds 0..5> to add send/recv throughput (bytes/sec).
    """

    serializer_class = NetworkInterfaceSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        interval = _float_param(request, "interval", 0.0, 0.0, 5.0)
        return Response(self.get_serializer(services.get_network(interval=interval), many=True).data)


class StorageView(GenericAPIView):
    """GET /api/v1/system/storage/ — nested directory-size tree from a path.

    Query:
      ?path=<dir>   directory to inspect (default: user home)
      ?depth=<1..4> levels of children to list (default 2); sizes are recursive.
    """

    serializer_class = StorageTreeSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        path = request.query_params.get("path") or os.path.expanduser("~")
        depth = _int_param(request, "depth", 2, 1, 4)
        try:
            data = services.get_storage_tree(path, depth=depth)
        except FileNotFoundError as exc:
            raise NotFound(str(exc))
        except PermissionError as exc:
            raise ValidationError({"path": str(exc)})
        return Response(self.get_serializer(data).data)
