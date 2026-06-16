"""Manage the tmux sessions that back the web terminals.

ttyd attaches each browser pane to a tmux session (persistent, survives
disconnect). These endpoints list / create / kill those sessions so the
dashboard can show active terminals in a table and let the user pick which to
view. Uses the same tmux binary + default socket as the ttyd service (same
user), so both see the same sessions.
"""
import re
import subprocess

from django.conf import settings
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.audit.recorder import record_event


def _actor(request: Request) -> str:
    return getattr(request.user, "username", "") or "anonymous"


def _ip(request: Request) -> str | None:
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")

NAME_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")
# Unit-separator delimiter so paths/commands with spaces (or even '|') survive.
_SEP = "\x1f"
_FORMAT = _SEP.join(
    [
        "#{session_name}",
        "#{session_windows}",
        "#{session_created}",
        "#{session_activity}",
        "#{?session_attached,1,0}",
        "#{pane_current_command}",
        "#{pane_current_path}",
    ]
)


def _tmux(*args: str, timeout: float = 5.0) -> subprocess.CompletedProcess:
    return subprocess.run(
        [settings.PC_TMUX_BIN, *args], capture_output=True, text=True, timeout=timeout
    )


class SessionsView(APIView):
    def get(self, request: Request, *args, **kwargs) -> Response:
        try:
            res = _tmux("list-sessions", "-F", _FORMAT)
        except (subprocess.SubprocessError, OSError) as exc:
            raise ValidationError({"detail": f"tmux unavailable: {exc}"})
        if res.returncode != 0:
            return Response({"sessions": []})  # "no server running" == none yet
        sessions = []
        for line in res.stdout.strip().splitlines():
            parts = line.split(_SEP)
            if len(parts) != 7:
                continue
            name, windows, created, activity, attached, command, path = parts
            sessions.append(
                {
                    "name": name,
                    "windows": int(windows) if windows.isdigit() else 0,
                    "created": int(created) if created.isdigit() else None,
                    "activity": int(activity) if activity.isdigit() else None,
                    "attached": attached == "1",
                    "command": command or None,
                    "path": path or None,
                }
            )
        # Attached first, then most recently active.
        sessions.sort(key=lambda s: (not s["attached"], -(s["activity"] or 0)))
        return Response({"sessions": sessions})

    def post(self, request: Request, *args, **kwargs) -> Response:
        name = (request.data.get("name") or "").strip()
        if not NAME_RE.match(name):
            raise ValidationError({"name": "1–32 chars: letters, digits, _ or -."})
        res = _tmux("new-session", "-d", "-s", name, settings.PC_TERMINAL_SHELL_CMD.format(name=name))
        if res.returncode != 0:
            raise ValidationError({"name": res.stderr.strip() or "Could not create session."})
        record_event(_actor(request), "session.create", target=name, ip=_ip(request))
        return Response({"name": name}, status=201)


class SessionDetailView(APIView):
    def delete(self, request: Request, name: str, *args, **kwargs) -> Response:
        if not NAME_RE.match(name):
            raise NotFound("Session not found.")
        res = _tmux("kill-session", "-t", name)
        if res.returncode != 0:
            raise NotFound("Session not found.")
        record_event(_actor(request), "session.kill", target=name, ip=_ip(request))
        return Response(status=204)
