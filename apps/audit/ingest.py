"""Background ingester: tails the local audit files into the database.

Runs in one daemon thread. It only reads complete (newline-terminated) lines,
persists byte offsets so it resumes after a restart, and batches inserts so the
slow remote DB write happens off the request path. Failures are swallowed and
retried on the next tick — logging must never take the app down.
"""
from __future__ import annotations

import json
import threading
import time
from datetime import datetime, timezone

from apps.audit.recorder import AUDIT_DIR, COMMANDS_FILE, EVENTS_FILE, OFFSETS_FILE

_POLL_SECONDS = 2.0
_MAX_BATCH = 500
_started = False
_lock = threading.Lock()


def start_ingester() -> None:
    global _started
    with _lock:
        if _started:
            return
        _started = True
    threading.Thread(target=_run, name="audit-ingester", daemon=True).start()


def _load_offsets() -> dict[str, int]:
    try:
        return json.loads(OFFSETS_FILE.read_text())
    except Exception:
        return {}


def _save_offsets(offsets: dict[str, int]) -> None:
    try:
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        OFFSETS_FILE.write_text(json.dumps(offsets))
    except Exception:
        pass


def _read_new_lines(path, key: str, offsets: dict[str, int]) -> list[str]:
    if not path.exists():
        return []
    size = path.stat().st_size
    start = offsets.get(key, 0)
    if start > size:  # truncated / rotated
        start = 0
    if start >= size:
        return []
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        fh.seek(start)
        data = fh.read()
    # Only consume up to the last complete line.
    last_nl = data.rfind("\n")
    if last_nl == -1:
        return []
    consumed = data[: last_nl + 1]
    offsets[key] = start + len(consumed.encode("utf-8"))
    return [ln for ln in consumed.splitlines() if ln.strip()]


def _utc(ts: float) -> datetime:
    return datetime.fromtimestamp(ts, tz=timezone.utc)


def _run() -> None:
    from apps.audit.models import AuditEvent

    offsets = _load_offsets()
    while True:
        try:
            batch: list[AuditEvent] = []

            for line in _read_new_lines(EVENTS_FILE, "events", offsets):
                try:
                    e = json.loads(line)
                except json.JSONDecodeError:
                    continue
                batch.append(
                    AuditEvent(
                        created_at=_utc(float(e.get("ts", time.time()))),
                        actor=str(e.get("actor", ""))[:64],
                        action=str(e.get("action", ""))[:32],
                        target=str(e.get("target", ""))[:128],
                        detail=str(e.get("detail", "")),
                        source_ip=e.get("ip") or None,
                    )
                )

            for line in _read_new_lines(COMMANDS_FILE, "commands", offsets):
                parts = line.split("\t")
                if len(parts) < 4:
                    continue
                ts, session, cwd, cmd = parts[0], parts[1], parts[2], "\t".join(parts[3:])
                try:
                    when = _utc(float(ts))
                except ValueError:
                    when = datetime.now(tz=timezone.utc)
                batch.append(
                    AuditEvent(
                        created_at=when,
                        actor="shell",
                        action="command",
                        target=session[:128],
                        detail=f"{cwd}$ {cmd}",
                    )
                )

            if batch:
                AuditEvent.objects.bulk_create(batch[:_MAX_BATCH], ignore_conflicts=True)
                _save_offsets(offsets)
        except Exception:
            # DB not migrated yet / transient error — retry next tick.
            pass
        time.sleep(_POLL_SECONDS)
