"""Write audit events to a local append-only file — instantly, no DB.

Both the API (session create/kill) and the shell (command hook) append here; a
background ingester (ingest.py) batches these into the database off the request
path, so logging never adds latency to usage.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

AUDIT_DIR = Path(os.environ.get("PCTERM_AUDIT_DIR", os.path.expanduser("~/.pcterm/audit")))
EVENTS_FILE = AUDIT_DIR / "events.jsonl"
COMMANDS_FILE = AUDIT_DIR / "commands.log"
OFFSETS_FILE = AUDIT_DIR / "offsets.json"


def record_event(actor: str, action: str, target: str = "", detail: str = "", ip: str | None = None) -> None:
    """Append one event line. Best-effort: never raises into the caller."""
    try:
        AUDIT_DIR.mkdir(parents=True, exist_ok=True)
        line = json.dumps(
            {"ts": time.time(), "actor": actor, "action": action, "target": target, "detail": detail, "ip": ip}
        )
        with open(EVENTS_FILE, "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except Exception:
        pass
