"""Host-system inspection helpers.

Thin functional layer over psutil. Views stay dumb; all data gathering lives
here so it can be reused (management commands, scheduled samplers, etc.) and
unit-tested in isolation.
"""
from __future__ import annotations

import platform
import socket
from datetime import datetime, timezone
from typing import Any

import psutil


def _utc(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def get_status() -> dict[str, Any]:
    """High-level snapshot: host identity + CPU / memory / uptime."""
    vmem = psutil.virtual_memory()
    swap = psutil.swap_memory()
    boot = psutil.boot_time()
    return {
        "hostname": socket.gethostname(),
        "platform": platform.platform(),
        "system": platform.system(),
        "release": platform.release(),
        "architecture": platform.machine(),
        "boot_time": _utc(boot),
        "uptime_seconds": int(datetime.now(tz=timezone.utc).timestamp() - boot),
        "cpu_count_logical": psutil.cpu_count(logical=True),
        "cpu_count_physical": psutil.cpu_count(logical=False),
        "cpu_percent": psutil.cpu_percent(interval=0.2),
        "load_average": list(psutil.getloadavg()) if hasattr(psutil, "getloadavg") else None,
        "memory_total": vmem.total,
        "memory_available": vmem.available,
        "memory_used": vmem.used,
        "memory_percent": vmem.percent,
        "swap_total": swap.total,
        "swap_used": swap.used,
        "swap_percent": swap.percent,
    }


def get_disks() -> list[dict[str, Any]]:
    """Per-partition capacity/usage plus aggregate IO counters."""
    partitions: list[dict[str, Any]] = []
    for part in psutil.disk_partitions(all=False):
        try:
            usage = psutil.disk_usage(part.mountpoint)
        except (PermissionError, OSError):
            continue
        partitions.append(
            {
                "device": part.device,
                "mountpoint": part.mountpoint,
                "fstype": part.fstype,
                "total": usage.total,
                "used": usage.used,
                "free": usage.free,
                "percent": usage.percent,
            }
        )
    return partitions


def get_disk_io() -> dict[str, Any] | None:
    io = psutil.disk_io_counters()
    if io is None:
        return None
    return {
        "read_bytes": io.read_bytes,
        "write_bytes": io.write_bytes,
        "read_count": io.read_count,
        "write_count": io.write_count,
    }


def get_network() -> list[dict[str, Any]]:
    """Per-interface IO counters, link state, speed and addresses.

    Covers the 'track ethernet usage' use case: bytes/packets sent & received
    per NIC, with up/down state and negotiated speed.
    """
    io_counters = psutil.net_io_counters(pernic=True)
    if_stats = psutil.net_if_stats()
    if_addrs = psutil.net_if_addrs()

    interfaces: list[dict[str, Any]] = []
    for name, io in io_counters.items():
        stats = if_stats.get(name)
        addrs = [
            {"family": str(addr.family), "address": addr.address, "netmask": addr.netmask}
            for addr in if_addrs.get(name, [])
        ]
        interfaces.append(
            {
                "name": name,
                "is_up": stats.isup if stats else None,
                "speed_mbps": stats.speed if stats else None,
                "mtu": stats.mtu if stats else None,
                "bytes_sent": io.bytes_sent,
                "bytes_recv": io.bytes_recv,
                "packets_sent": io.packets_sent,
                "packets_recv": io.packets_recv,
                "errin": io.errin,
                "errout": io.errout,
                "dropin": io.dropin,
                "dropout": io.dropout,
                "addresses": addrs,
            }
        )
    return interfaces
