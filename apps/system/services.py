"""Host-system inspection helpers (real-time, nothing persisted).

Thin functional layer over psutil + nvidia-smi. Views stay dumb; all data
gathering lives here so it can be reused and unit-tested in isolation.
"""
from __future__ import annotations

import os
import platform
import shutil
import socket
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import psutil


def _utc(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def human_bytes(num: float) -> str:
    step = 1024.0
    for unit in ("B", "KB", "MB", "GB", "TB", "PB"):
        if abs(num) < step:
            return f"{num:.1f} {unit}"
        num /= step
    return f"{num:.1f} EB"


# ─────────────────────────────────────────────────────────────────────────────
# Overview / CPU / memory
# ─────────────────────────────────────────────────────────────────────────────
def _os_pretty_name() -> str | None:
    try:
        with open("/etc/os-release", encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("PRETTY_NAME="):
                    return line.split("=", 1)[1].strip().strip('"')
    except OSError:
        pass
    return None


def _cmd_first_line(args: list[str], timeout: float = 6.0) -> str | None:
    try:
        out = subprocess.run(args, capture_output=True, text=True, timeout=timeout, check=True).stdout
    except (subprocess.SubprocessError, OSError):
        return None
    line = out.strip().splitlines()[0] if out.strip() else ""
    return line or None


_SOFTWARE_CACHE: dict[str, Any] | None = None


def get_software() -> dict[str, Any]:
    """Versions of key software on the host. Cached — these don't change at
    runtime, and probing torch is slow, so compute once."""
    global _SOFTWARE_CACHE
    if _SOFTWARE_CACHE is not None:
        return _SOFTWARE_CACHE

    import sys

    info: dict[str, Any] = {
        "python": platform.python_version(),
        "os": _os_pretty_name() or platform.system(),
        "kernel": platform.release(),
        "architecture": platform.machine(),
    }
    try:
        import django

        info["django"] = django.get_version()
    except Exception:
        info["django"] = None

    # PyTorch in a subprocess so torch (and its CUDA libs) never load into the
    # long-running server process; only static version attrs are read.
    torch_out = _cmd_first_line(
        [sys.executable, "-c", "import torch;print(f'{torch.__version__}|{torch.version.cuda}')"],
        timeout=20.0,
    )
    if torch_out and "|" in torch_out:
        ver, cuda = torch_out.split("|", 1)
        info["pytorch"] = ver
        info["cuda"] = None if cuda in ("None", "") else cuda
    else:
        info["pytorch"] = None
        info["cuda"] = None

    info["nvidia_driver"] = _cmd_first_line(
        ["nvidia-smi", "--query-gpu=driver_version", "--format=csv,noheader,nounits"]
    )
    node_bin = next(
        (p for p in (os.path.expanduser("~/.local/node/bin/node"), os.path.expanduser("~/.local/bin/node")) if os.path.exists(p)),
        "node",
    )
    node = _cmd_first_line([node_bin, "--version"])
    info["node"] = node.lstrip("v") if node else None
    git = _cmd_first_line(["git", "--version"])
    info["git"] = git.replace("git version ", "") if git else None
    rclone = _cmd_first_line(["rclone", "version"])
    info["rclone"] = rclone.replace("rclone ", "") if rclone else None

    _SOFTWARE_CACHE = info
    return info


def read_cpu_model() -> str | None:
    """CPU model name (Linux /proc/cpuinfo, falling back to platform)."""
    try:
        with open("/proc/cpuinfo", encoding="utf-8") as fh:
            for line in fh:
                if line.startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or None


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
        "cpu_model": read_cpu_model(),
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


def get_cpu_temperature() -> tuple[float | None, list[float]]:
    """(package_temp, per_physical_core_temps) from coretemp/k10temp, if present."""
    raw = getattr(psutil, "sensors_temperatures", lambda: {})() or {}
    for chip in ("coretemp", "k10temp", "zenpower"):
        readings = raw.get(chip)
        if not readings:
            continue
        package: float | None = None
        cores: list[float] = []
        for r in readings:
            label = (r.label or "").lower()
            if "package" in label or "tctl" in label or "tdie" in label:
                package = r.current
            elif label.startswith("core") or "ccd" in label:
                cores.append(r.current)
        if package is None:
            package = max(cores) if cores else readings[0].current
        return package, cores
    return None, []


def get_cpu(interval: float = 0.3) -> dict[str, Any]:
    """Overall + per-core utilisation, frequency, times, load average and temp."""
    overall = psutil.cpu_percent(interval=interval)
    per_core = psutil.cpu_percent(interval=0.0, percpu=True)
    freq = psutil.cpu_freq()
    per_core_freq = psutil.cpu_freq(percpu=True) or []
    times = psutil.cpu_times_percent(interval=0.0)
    temp_package, temp_cores = get_cpu_temperature()
    return {
        "temperature_c": temp_package,
        "per_core_temp_c": temp_cores,
        "count_logical": psutil.cpu_count(logical=True),
        "count_physical": psutil.cpu_count(logical=False),
        "percent": overall,
        "per_core_percent": per_core,
        "frequency_mhz": getattr(freq, "current", None),
        "frequency_min_mhz": getattr(freq, "min", None),
        "frequency_max_mhz": getattr(freq, "max", None),
        "per_core_frequency_mhz": [getattr(f, "current", None) for f in per_core_freq],
        "load_average": list(psutil.getloadavg()) if hasattr(psutil, "getloadavg") else None,
        "times_percent": {
            "user": times.user,
            "system": times.system,
            "idle": times.idle,
            "iowait": getattr(times, "iowait", None),
        },
    }


def get_memory() -> dict[str, Any]:
    vmem = psutil.virtual_memory()
    swap = psutil.swap_memory()

    def opt(obj, attr):
        # Several fields are platform dependent (e.g. cached/buffers are Linux-only).
        value = getattr(obj, attr, None)
        return int(value) if value is not None else None

    return {
        "virtual": {
            "total": vmem.total,
            "available": vmem.available,
            "used": vmem.used,
            "free": vmem.free,
            "percent": vmem.percent,
            "cached": opt(vmem, "cached"),
            "buffers": opt(vmem, "buffers"),
            "shared": opt(vmem, "shared"),
            "active": opt(vmem, "active"),
            "inactive": opt(vmem, "inactive"),
            "total_human": human_bytes(vmem.total),
            "used_human": human_bytes(vmem.used),
        },
        "swap": {
            "total": swap.total,
            "used": swap.used,
            "free": swap.free,
            "percent": swap.percent,
            "sin": opt(swap, "sin"),
            "sout": opt(swap, "sout"),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Temperature / fans
# ─────────────────────────────────────────────────────────────────────────────
def get_temperatures() -> dict[str, Any]:
    """Flattened sensor temperatures + fan speeds (platform dependent)."""
    temps: list[dict[str, Any]] = []
    raw_temps = getattr(psutil, "sensors_temperatures", lambda: {})() or {}
    for chip, readings in raw_temps.items():
        for r in readings:
            temps.append(
                {
                    "chip": chip,
                    "label": r.label or None,
                    "current": r.current,
                    "high": r.high,
                    "critical": r.critical,
                }
            )
    fans: list[dict[str, Any]] = []
    raw_fans = getattr(psutil, "sensors_fans", lambda: {})() or {}
    for chip, readings in raw_fans.items():
        for r in readings:
            fans.append({"chip": chip, "label": r.label or None, "rpm": r.current})
    return {"temperatures": temps, "fans": fans}


# ─────────────────────────────────────────────────────────────────────────────
# GPU (NVIDIA via nvidia-smi)
# ─────────────────────────────────────────────────────────────────────────────
_GPU_FIELDS = [
    ("index", int),
    ("name", str),
    ("temperature.gpu", float),
    ("utilization.gpu", float),
    ("utilization.memory", float),
    ("memory.total", float),
    ("memory.used", float),
    ("memory.free", float),
    ("power.draw", float),
    ("power.limit", float),
    ("fan.speed", float),
    ("clocks.current.sm", float),
    ("clocks.current.memory", float),
]


def _to(value: str, caster):
    value = value.strip()
    if value in ("", "[N/A]", "[Not Supported]", "N/A"):
        return None
    try:
        return caster(value)
    except (ValueError, TypeError):
        return value


def get_gpu() -> dict[str, Any]:
    """NVIDIA GPU(s) via nvidia-smi. Returns available=False if not present."""
    smi = shutil.which("nvidia-smi")
    if not smi:
        return {"available": False, "reason": "nvidia-smi not found", "gpus": []}
    query = ",".join(name for name, _ in _GPU_FIELDS)
    try:
        out = subprocess.run(
            [smi, f"--query-gpu={query}", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        ).stdout
    except (subprocess.SubprocessError, OSError) as exc:
        return {"available": False, "reason": str(exc), "gpus": []}

    gpus: list[dict[str, Any]] = []
    for line in filter(None, (ln.strip() for ln in out.splitlines())):
        cells = [c.strip() for c in line.split(",")]
        if len(cells) != len(_GPU_FIELDS):
            continue
        row = {
            "index": _to(cells[0], int),
            "name": cells[1] or None,
            "temperature_c": _to(cells[2], float),
            "utilization_gpu_percent": _to(cells[3], float),
            "utilization_memory_percent": _to(cells[4], float),
            "memory_total_mb": _to(cells[5], float),
            "memory_used_mb": _to(cells[6], float),
            "memory_free_mb": _to(cells[7], float),
            "power_draw_w": _to(cells[8], float),
            "power_limit_w": _to(cells[9], float),
            "fan_speed_percent": _to(cells[10], float),
            "clock_sm_mhz": _to(cells[11], float),
            "clock_memory_mhz": _to(cells[12], float),
        }
        gpus.append(row)
    return {"available": True, "gpus": gpus}


# ─────────────────────────────────────────────────────────────────────────────
# Disks: partitions, IO counters + (optional) utilisation/throughput sampling
# ─────────────────────────────────────────────────────────────────────────────
def get_disks() -> list[dict[str, Any]]:
    """Per-partition capacity/usage."""
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
                "total_human": human_bytes(usage.total),
                "used_human": human_bytes(usage.used),
                "free_human": human_bytes(usage.free),
            }
        )
    return partitions


def get_disk_io(interval: float = 0.0) -> list[dict[str, Any]]:
    """Per-disk IO counters. If interval>0, also compute throughput and busy %."""
    first = psutil.disk_io_counters(perdisk=True) or {}
    second = first
    if interval > 0:
        time.sleep(interval)
        second = psutil.disk_io_counters(perdisk=True) or {}

    rows: list[dict[str, Any]] = []
    for name, io in second.items():
        row = {
            "device": name,
            "read_bytes": io.read_bytes,
            "write_bytes": io.write_bytes,
            "read_count": io.read_count,
            "write_count": io.write_count,
            "busy_time_ms": getattr(io, "busy_time", None),
        }
        if interval > 0 and name in first:
            prev = first[name]
            row["read_bytes_per_sec"] = max(0, io.read_bytes - prev.read_bytes) / interval
            row["write_bytes_per_sec"] = max(0, io.write_bytes - prev.write_bytes) / interval
            if getattr(io, "busy_time", None) is not None and getattr(prev, "busy_time", None) is not None:
                busy_delta_ms = max(0, io.busy_time - prev.busy_time)
                row["utilization_percent"] = min(100.0, busy_delta_ms / (interval * 1000.0) * 100.0)
        rows.append(row)
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# Network: per-interface counters + (optional) throughput sampling
# ─────────────────────────────────────────────────────────────────────────────
def get_network(interval: float = 0.0) -> list[dict[str, Any]]:
    """Per-interface IO counters, link state, speed, addresses.

    Covers 'track ethernet usage': bytes/packets sent & received per NIC.
    If interval>0, also samples send/recv throughput (bytes/sec).
    """
    first = psutil.net_io_counters(pernic=True)
    second = first
    if interval > 0:
        time.sleep(interval)
        second = psutil.net_io_counters(pernic=True)

    if_stats = psutil.net_if_stats()
    if_addrs = psutil.net_if_addrs()

    interfaces: list[dict[str, Any]] = []
    for name, io in second.items():
        stats = if_stats.get(name)
        addrs = [
            {"family": str(addr.family), "address": addr.address, "netmask": addr.netmask}
            for addr in if_addrs.get(name, [])
        ]
        row = {
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
        if interval > 0 and name in first:
            prev = first[name]
            row["bytes_sent_per_sec"] = max(0, io.bytes_sent - prev.bytes_sent) / interval
            row["bytes_recv_per_sec"] = max(0, io.bytes_recv - prev.bytes_recv) / interval
        interfaces.append(row)
    return interfaces


# ─────────────────────────────────────────────────────────────────────────────
# Storage tree: nested directory sizes from a selected path, limited depth
# ─────────────────────────────────────────────────────────────────────────────
def get_storage_tree(path: str, depth: int = 2) -> dict[str, Any]:
    """Directory-size breakdown rooted at ``path``, nested to ``depth`` levels.

    Sizes are fully recursive (everything under a node), but children are only
    listed down to ``depth`` levels so the response stays bounded. Symlinks are
    not followed. Children are sorted largest-first.
    """
    root = Path(path).expanduser()
    try:
        root = root.resolve(strict=True)
    except (FileNotFoundError, RuntimeError, OSError) as exc:
        raise FileNotFoundError(f"Path not found: {path}") from exc

    usage = None
    try:
        du = psutil.disk_usage(str(root if root.is_dir() else root.parent))
        usage = {"total": du.total, "used": du.used, "free": du.free, "percent": du.percent}
    except (PermissionError, OSError):
        pass

    if root.is_file():
        size = root.stat().st_size
        tree = {"name": root.name, "path": str(root), "type": "file", "size_bytes": size,
                "size_human": human_bytes(size)}
    else:
        tree = _dir_node(str(root), root.name or str(root), depth)
        tree["path"] = str(root)

    return {"path": str(root), "depth": depth, "disk": usage, "tree": tree}


def _dir_node(path: str, name: str, out_depth: int) -> dict[str, Any]:
    """Recurse fully for size; record children only while out_depth > 0."""
    size = 0
    children: list[dict[str, Any]] = []
    error = None
    try:
        with os.scandir(path) as it:
            for entry in it:
                try:
                    if entry.is_symlink():
                        continue
                    if entry.is_dir(follow_symlinks=False):
                        sub = _dir_node(entry.path, entry.name, out_depth - 1)
                        size += sub["size_bytes"]
                        if out_depth > 0:
                            children.append(sub)
                    else:
                        sz = entry.stat(follow_symlinks=False).st_size
                        size += sz
                        if out_depth > 0:
                            children.append(
                                {
                                    "name": entry.name,
                                    "path": entry.path,
                                    "type": "file",
                                    "size_bytes": sz,
                                    "size_human": human_bytes(sz),
                                }
                            )
                except (PermissionError, OSError):
                    continue
    except (PermissionError, OSError) as exc:
        error = str(exc)

    node: dict[str, Any] = {
        "name": name,
        "path": path,
        "type": "dir",
        "size_bytes": size,
        "size_human": human_bytes(size),
    }
    if error:
        node["error"] = error
    if out_depth > 0:
        children.sort(key=lambda c: c["size_bytes"], reverse=True)
        node["children"] = children
    return node
