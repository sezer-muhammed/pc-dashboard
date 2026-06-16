# No database models yet.
#
# System metrics are read live from the host via psutil (see services.py), so
# they don't need persistence. When you want history (e.g. store disk/network
# samples over time), add models here and create a migration:
#
#     class ResourceSample(models.Model):
#         created_at = models.DateTimeField(auto_now_add=True)
#         cpu_percent = models.FloatField()
#         ...
#
# from django.db import models
