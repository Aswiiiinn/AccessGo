from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from apps.reports.models import AccessibilityReport

from .filters import AdminReportFilter, AdminUserFilter
from .permissions import IsAdminRole, IsAdminUser
from .serializers import (
    AdminRejectReportSerializer,
    AdminReportByCategorySerializer,
    AdminReportByStatusSerializer,
    AdminReportDetailSerializer,
    AdminReportListSerializer,
    AdminReportModerationSerializer,
    AdminReportsOverTimeSerializer,
    AdminUserDetailSerializer,
    AdminUserListSerializer,
    AdminUserStatusUpdateSerializer,
    DashboardStatisticsSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)
from .services import (
    get_admin_dashboard_statistics,
    get_admin_report_detail_queryset,
    get_admin_reports_queryset,
    get_admin_user_detail_queryset,
    get_admin_users_queryset,
    get_high_severity_pending_reports,
    get_reports_by_category,
    get_reports_by_status,
    get_reports_over_time,
    reject_report,
    request_report_info,
    resolve_report,
    update_user_account_status,
    verify_report,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user


class AdminDashboardStatisticsView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        data = get_admin_dashboard_statistics()
        return Response(DashboardStatisticsSerializer(data).data)


class AdminReportListView(generics.ListAPIView):
    permission_classes = (IsAdminRole,)
    serializer_class = AdminReportListSerializer
    queryset = get_admin_reports_queryset()
    filterset_class = AdminReportFilter
    search_fields = ("title", "description")
    ordering_fields = ("created_at", "status", "accessibility_impact", "category", "title")
    ordering = ("-created_at",)


class AdminReportDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAdminRole,)
    serializer_class = AdminReportDetailSerializer
    queryset = get_admin_report_detail_queryset()
    lookup_url_kwarg = "id"


class _AdminModerationActionView(APIView):
    permission_classes = (IsAdminRole,)

    def get_report(self, id):
        return get_object_or_404(get_admin_report_detail_queryset(), pk=id)


class AdminVerifyReportView(_AdminModerationActionView):
    def post(self, request, id):
        report = self.get_report(id)
        serializer = AdminReportModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = verify_report(report, request.user, serializer.validated_data.get("review_comment", ""))
        updated = get_admin_report_detail_queryset().get(pk=updated.pk)
        return Response(AdminReportDetailSerializer(updated).data)


class AdminRejectReportView(_AdminModerationActionView):
    def post(self, request, id):
        report = self.get_report(id)
        serializer = AdminRejectReportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = reject_report(report, request.user, serializer.validated_data["review_comment"])
        updated = get_admin_report_detail_queryset().get(pk=updated.pk)
        return Response(AdminReportDetailSerializer(updated).data)


class AdminResolveReportView(_AdminModerationActionView):
    def post(self, request, id):
        report = self.get_report(id)
        serializer = AdminReportModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = resolve_report(report, request.user, serializer.validated_data.get("review_comment", ""))
        updated = get_admin_report_detail_queryset().get(pk=updated.pk)
        return Response(AdminReportDetailSerializer(updated).data)


class AdminRequestInfoReportView(_AdminModerationActionView):
    def post(self, request, id):
        report = self.get_report(id)
        serializer = AdminReportModerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = request_report_info(report, request.user, serializer.validated_data.get("review_comment", ""))
        updated = get_admin_report_detail_queryset().get(pk=updated.pk)
        return Response(AdminReportDetailSerializer(updated).data)


class AdminReportsByCategoryView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        data = get_reports_by_category()
        return Response(AdminReportByCategorySerializer(data, many=True).data)


class AdminReportsByStatusView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        data = get_reports_by_status()
        return Response(AdminReportByStatusSerializer(data, many=True).data)


class AdminReportsOverTimeView(APIView):
    permission_classes = (IsAdminRole,)

    def get(self, request):
        group = request.query_params.get("group", "day")
        if group not in ("day", "month"):
            return Response({"error": True, "status_code": 400, "detail": {"group": "Must be 'day' or 'month'."}}, status=status.HTTP_400_BAD_REQUEST)
        data = get_reports_over_time(group=group)
        return Response(AdminReportsOverTimeSerializer(data).data)


class AdminHighSeverityReportsView(generics.ListAPIView):
    permission_classes = (IsAdminRole,)
    serializer_class = AdminReportListSerializer
    queryset = get_high_severity_pending_reports()
    pagination_class = None


class AdminUserListView(generics.ListAPIView):
    permission_classes = (IsAdminRole,)
    serializer_class = AdminUserListSerializer
    queryset = get_admin_users_queryset()
    filterset_class = AdminUserFilter
    search_fields = ("email", "username", "full_name", "first_name", "last_name")
    ordering_fields = ("date_joined", "created_at", "email", "role")
    ordering = ("-date_joined",)


class AdminUserDetailView(generics.RetrieveAPIView):
    permission_classes = (IsAdminRole,)
    serializer_class = AdminUserDetailSerializer
    queryset = get_admin_user_detail_queryset()
    lookup_url_kwarg = "id"


class AdminUserStatusUpdateView(APIView):
    permission_classes = (IsAdminRole,)

    def patch(self, request, id):
        user = get_object_or_404(get_admin_user_detail_queryset(), pk=id)
        serializer = AdminUserStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = update_user_account_status(user, request.user, serializer.validated_data["is_active"])
        updated = get_admin_user_detail_queryset().get(pk=updated.pk)
        return Response(AdminUserDetailSerializer(updated).data)
