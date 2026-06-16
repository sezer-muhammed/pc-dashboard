"""DRF serializers for system metrics.

Plain (non-model) serializers describing the response shapes produced by
``services.py``. Optional fields (e.g. sampled throughput, present only when a
``?interval=`` is supplied) use ``required=False`` so they are simply omitted
when absent.
"""
from rest_framework import serializers


# ── Network ──────────────────────────────────────────────────────────────────
class NetworkAddressSerializer(serializers.Serializer):
    family = serializers.CharField()
    address = serializers.CharField(allow_null=True)
    netmask = serializers.CharField(allow_null=True)


class NetworkInterfaceSerializer(serializers.Serializer):
    name = serializers.CharField()
    is_up = serializers.BooleanField(allow_null=True)
    speed_mbps = serializers.IntegerField(allow_null=True)
    mtu = serializers.IntegerField(allow_null=True)
    bytes_sent = serializers.IntegerField()
    bytes_recv = serializers.IntegerField()
    packets_sent = serializers.IntegerField()
    packets_recv = serializers.IntegerField()
    errin = serializers.IntegerField()
    errout = serializers.IntegerField()
    dropin = serializers.IntegerField()
    dropout = serializers.IntegerField()
    bytes_sent_per_sec = serializers.FloatField(required=False)
    bytes_recv_per_sec = serializers.FloatField(required=False)
    addresses = NetworkAddressSerializer(many=True)


# ── Disks ────────────────────────────────────────────────────────────────────
class DiskPartitionSerializer(serializers.Serializer):
    device = serializers.CharField()
    mountpoint = serializers.CharField()
    fstype = serializers.CharField()
    total = serializers.IntegerField()
    used = serializers.IntegerField()
    free = serializers.IntegerField()
    percent = serializers.FloatField()
    total_human = serializers.CharField()
    used_human = serializers.CharField()
    free_human = serializers.CharField()


class DiskIOSerializer(serializers.Serializer):
    device = serializers.CharField()
    read_bytes = serializers.IntegerField()
    write_bytes = serializers.IntegerField()
    read_count = serializers.IntegerField()
    write_count = serializers.IntegerField()
    busy_time_ms = serializers.IntegerField(allow_null=True)
    read_bytes_per_sec = serializers.FloatField(required=False)
    write_bytes_per_sec = serializers.FloatField(required=False)
    utilization_percent = serializers.FloatField(required=False)


class DiskReportSerializer(serializers.Serializer):
    partitions = DiskPartitionSerializer(many=True)
    io = DiskIOSerializer(many=True)


# ── CPU / memory ─────────────────────────────────────────────────────────────
class CpuTimesSerializer(serializers.Serializer):
    user = serializers.FloatField()
    system = serializers.FloatField()
    idle = serializers.FloatField()
    iowait = serializers.FloatField(allow_null=True, required=False)


class CpuSerializer(serializers.Serializer):
    count_logical = serializers.IntegerField(allow_null=True)
    count_physical = serializers.IntegerField(allow_null=True)
    percent = serializers.FloatField()
    temperature_c = serializers.FloatField(allow_null=True)
    per_core_temp_c = serializers.ListField(child=serializers.FloatField(), required=False)
    per_core_percent = serializers.ListField(child=serializers.FloatField())
    frequency_mhz = serializers.FloatField(allow_null=True)
    frequency_min_mhz = serializers.FloatField(allow_null=True)
    frequency_max_mhz = serializers.FloatField(allow_null=True)
    per_core_frequency_mhz = serializers.ListField(child=serializers.FloatField(allow_null=True))
    load_average = serializers.ListField(child=serializers.FloatField(), allow_null=True)
    times_percent = CpuTimesSerializer()


class MemBlockSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    used = serializers.IntegerField()
    free = serializers.IntegerField()
    percent = serializers.FloatField()
    available = serializers.IntegerField(required=False)
    total_human = serializers.CharField(required=False)
    used_human = serializers.CharField(required=False)


class MemorySerializer(serializers.Serializer):
    virtual = MemBlockSerializer()
    swap = MemBlockSerializer()


# ── Temperature / fans ───────────────────────────────────────────────────────
class TemperatureReadingSerializer(serializers.Serializer):
    chip = serializers.CharField()
    label = serializers.CharField(allow_null=True)
    current = serializers.FloatField(allow_null=True)
    high = serializers.FloatField(allow_null=True)
    critical = serializers.FloatField(allow_null=True)


class FanReadingSerializer(serializers.Serializer):
    chip = serializers.CharField()
    label = serializers.CharField(allow_null=True)
    rpm = serializers.IntegerField(allow_null=True)


class TemperatureReportSerializer(serializers.Serializer):
    temperatures = TemperatureReadingSerializer(many=True)
    fans = FanReadingSerializer(many=True)


# ── GPU ──────────────────────────────────────────────────────────────────────
class GpuSerializer(serializers.Serializer):
    index = serializers.IntegerField(allow_null=True)
    name = serializers.CharField(allow_null=True)
    temperature_c = serializers.FloatField(allow_null=True)
    utilization_gpu_percent = serializers.FloatField(allow_null=True)
    utilization_memory_percent = serializers.FloatField(allow_null=True)
    memory_total_mb = serializers.FloatField(allow_null=True)
    memory_used_mb = serializers.FloatField(allow_null=True)
    memory_free_mb = serializers.FloatField(allow_null=True)
    power_draw_w = serializers.FloatField(allow_null=True)
    power_limit_w = serializers.FloatField(allow_null=True)
    fan_speed_percent = serializers.FloatField(allow_null=True)
    clock_sm_mhz = serializers.FloatField(allow_null=True)
    clock_memory_mhz = serializers.FloatField(allow_null=True)


class GpuReportSerializer(serializers.Serializer):
    available = serializers.BooleanField()
    reason = serializers.CharField(required=False)
    gpus = GpuSerializer(many=True)


# ── Storage tree (recursive) ─────────────────────────────────────────────────
class StorageNodeSerializer(serializers.Serializer):
    name = serializers.CharField()
    path = serializers.CharField()
    type = serializers.CharField()
    size_bytes = serializers.IntegerField()
    size_human = serializers.CharField()
    error = serializers.CharField(required=False)
    children = serializers.SerializerMethodField()

    def get_children(self, obj):
        children = obj.get("children")
        if children is None:
            return None
        return StorageNodeSerializer(children, many=True).data


class StorageTreeSerializer(serializers.Serializer):
    path = serializers.CharField()
    depth = serializers.IntegerField()
    disk = serializers.DictField(required=False, allow_null=True)
    tree = StorageNodeSerializer()


# ── Overview (status) ────────────────────────────────────────────────────────
class SystemStatusSerializer(serializers.Serializer):
    hostname = serializers.CharField()
    platform = serializers.CharField()
    system = serializers.CharField()
    release = serializers.CharField()
    architecture = serializers.CharField()
    cpu_model = serializers.CharField(allow_null=True)
    boot_time = serializers.DateTimeField()
    uptime_seconds = serializers.IntegerField()
    cpu_count_logical = serializers.IntegerField(allow_null=True)
    cpu_count_physical = serializers.IntegerField(allow_null=True)
    cpu_percent = serializers.FloatField()
    load_average = serializers.ListField(child=serializers.FloatField(), allow_null=True)
    memory_total = serializers.IntegerField()
    memory_available = serializers.IntegerField()
    memory_used = serializers.IntegerField()
    memory_percent = serializers.FloatField()
    swap_total = serializers.IntegerField()
    swap_used = serializers.IntegerField()
    swap_percent = serializers.FloatField()
