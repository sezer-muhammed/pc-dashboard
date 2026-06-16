"""Static-credential API authentication — no database involved.

The system endpoints only read the host (psutil) and return; they never need a
DB row. Validating the password against the user table meant a remote Turso
(us-east-1) lookup on every request (~1.5-2s). Instead we check the HTTP Basic
credential against values from the environment (PC_API_USERNAME /
PC_API_PASSWORD) in constant time. The database is left for the Django admin and
future feature tables only.
"""
from __future__ import annotations

import base64
import binascii
import secrets

from django.conf import settings
from rest_framework import authentication, exceptions


class StaticAPIUser:
    """Minimal authenticated principal (not a DB model)."""

    is_authenticated = True
    is_active = True
    is_staff = False
    is_anonymous = False
    pk = None
    id = None

    def __init__(self, username: str) -> None:
        self.username = username

    def __str__(self) -> str:
        return self.username


class StaticCredentialAuthentication(authentication.BaseAuthentication):
    """HTTP Basic auth validated against env credentials — zero DB access."""

    www_authenticate_realm = "api"

    def authenticate(self, request):
        header = request.META.get("HTTP_AUTHORIZATION", "")
        if not header.startswith("Basic "):
            return None  # let other authenticators (e.g. session) try

        try:
            decoded = base64.b64decode(header[6:].strip()).decode("utf-8")
        except (binascii.Error, UnicodeDecodeError):
            raise exceptions.AuthenticationFailed("Invalid Basic header.")
        username, sep, password = decoded.partition(":")
        if not sep:
            raise exceptions.AuthenticationFailed("Invalid Basic credentials.")

        expected_user = settings.PC_API_USERNAME
        expected_pass = settings.PC_API_PASSWORD
        if not expected_pass:
            raise exceptions.AuthenticationFailed("API credentials are not configured.")

        # Constant-time comparison so a wrong password can't be timed out.
        ok = secrets.compare_digest(username, expected_user) & secrets.compare_digest(
            password, expected_pass
        )
        if not ok:
            raise exceptions.AuthenticationFailed("Invalid credentials.")
        return (StaticAPIUser(username), None)

    def authenticate_header(self, request):
        return f'Basic realm="{self.www_authenticate_realm}"'
