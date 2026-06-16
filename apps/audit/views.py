"""Read the audit log. (Writes happen via the background ingester.)"""
from rest_framework.generics import GenericAPIView
from rest_framework.request import Request
from rest_framework.response import Response

from apps.audit.models import AuditEvent
from apps.audit.serializers import AuditEventSerializer


class EventsView(GenericAPIView):
    """GET /api/v1/audit/events/ — recent events.

    Query: ?action=<session.create|session.kill|command>, ?q=<substring>,
    ?limit=<n> (default 200, max 1000).
    """

    serializer_class = AuditEventSerializer

    def get(self, request: Request, *args, **kwargs) -> Response:
        qs = AuditEvent.objects.all()
        action = request.query_params.get("action")
        if action:
            qs = qs.filter(action=action)
        q = request.query_params.get("q")
        if q:
            qs = qs.filter(detail__icontains=q)
        try:
            limit = min(1000, max(1, int(request.query_params.get("limit", 200))))
        except (TypeError, ValueError):
            limit = 200
        return Response(self.get_serializer(qs[:limit], many=True).data)
