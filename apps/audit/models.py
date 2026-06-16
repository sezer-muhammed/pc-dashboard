from django.db import models


class AuditEvent(models.Model):
    """An audited action: a terminal session lifecycle event or a shell command.

    Rows are written by a background ingester (see ingest.py), never on the
    request/terminal path — so logging adds no latency to usage.
    """

    created_at = models.DateTimeField(db_index=True)  # when the event happened
    ingested_at = models.DateTimeField(auto_now_add=True)
    actor = models.CharField(max_length=64, blank=True)
    action = models.CharField(max_length=32, db_index=True)  # session.create / session.kill / command
    target = models.CharField(max_length=128, blank=True)  # session name
    detail = models.TextField(blank=True)  # command text / cwd / extra
    source_ip = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.created_at:%Y-%m-%d %H:%M:%S} {self.actor} {self.action} {self.target}"
