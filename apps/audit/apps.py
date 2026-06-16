import os

from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.audit"
    label = "audit"
    verbose_name = "Audit log"

    def ready(self) -> None:
        # Start the background ingester only in the serving process (runserver's
        # child sets RUN_MAIN=true), never during migrate/makemigrations/etc.
        if os.environ.get("RUN_MAIN") == "true":
            from apps.audit.ingest import start_ingester

            start_ingester()
