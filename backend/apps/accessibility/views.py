from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import AccessibilityLocation
from .serializers import AccessibilityLocationSerializer
from .filters import AccessibilityLocationFilter
from .services import get_nearby_locations


class AccessibilityLocationViewSet(viewsets.ModelViewSet):
    queryset = AccessibilityLocation.objects.filter(is_active=True).prefetch_related("attributes")
    serializer_class = AccessibilityLocationSerializer
    filterset_class = AccessibilityLocationFilter
    search_fields = ("name", "address")
    ordering_fields = ("name", "created_at")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    @action(detail=False, methods=["get"], url_path="nearby")
    def nearby(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radius = float(request.query_params.get("radius", 1.0))
        except (KeyError, ValueError):
            return Response(
                {"detail": "lat and lng are required numeric parameters."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        locations = get_nearby_locations(lat, lng, radius)
        serializer = self.get_serializer(locations, many=True)
        return Response(serializer.data)
