"""DRF serializers for system metrics.

These are plain (non-model) serializers describing the response shapes produced
by ``services.py``. They document the API and validate/normalise output.
"""
from rest_framework import serializers


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
    addresses = NetworkAddressSerializer(many=True)


class DiskPartitionSerializer(serializers.Serializer):
    device = serializers.CharField()
    mountpoint = serializers.CharField()
    fstype = serializers.CharField()
    total = serializers.IntegerField()
    used = serializers.IntegerField()
    free = serializers.IntegerField()
    percent = serializers.FloatField()


class DiskIOSerializer(serializers.Serializer):
    read_bytes = serializers.IntegerField()
    write_bytes = serializers.IntegerField()
    read_count = serializers.IntegerField()
    write_count = serializers.IntegerField()


class DiskReportSerializer(serializers.Serializer):
    partitions = DiskPartitionSerializer(many=True)
    io = DiskIOSerializer(allow_null=True)


class SystemStatusSerializer(serializers.Serializer):
    hostname = serializers.CharField()
    platform = serializers.CharField()
    system = serializers.CharField()
    release = serializers.CharField()
    architecture = serializers.CharField()
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
