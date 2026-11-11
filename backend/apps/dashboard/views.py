from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import IsAdminUser
from .serializers import DashboardStatsSerializer
from .services import get_dashboard_stats


class DashboardStatsView(APIView):
    permission_classes = (IsAdminUser,)

    def get(self, request):
        stats = get_dashboard_stats()
        serializer = DashboardStatsSerializer(stats)
        return Response(serializer.data)
