from django.apps import AppConfig


class TerminalConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.terminal"
    label = "terminal"
    verbose_name = "Terminal sessions"
