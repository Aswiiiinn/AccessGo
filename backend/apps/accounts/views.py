import logging
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
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
    ForgotPasswordSerializer,
    ResetPasswordConfirmSerializer,
    ResetPasswordTokenSerializer,
    ChangePasswordSerializer,
    ChangeEmailSerializer,
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
    revoke_all_refresh_tokens,
    update_user_account_status,
    verify_report,
)

logger = logging.getLogger(__name__)

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


class ForgotPasswordView(APIView):
    """Request a password reset email.

    Always returns the same 200 response so the endpoint cannot be used to discover
    which email addresses are registered. Rate limited per client IP.
    """

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "password_reset"
    serializer_class = ForgotPasswordSerializer
    GENERIC_RESPONSE = {"detail": "If an account with that email exists, a password reset link has been sent."}

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user is not None and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            reset_url = f"{settings.FRONTEND_BASE_URL.rstrip('/')}/reset-password?{urlencode({'uid': uid, 'token': token})}"
            expiry_minutes = max(1, settings.PASSWORD_RESET_TIMEOUT // 60)
            try:
                send_mail(
                    subject="AccessGo password reset",
                    message=(
                        "We received a request to reset your AccessGo password.\n\n"
                        f"Reset your password here: {reset_url}\n\n"
                        f"This link expires in {expiry_minutes} minutes and can only be used once.\n"
                        "If you did not request this, you can safely ignore this email."
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
            except Exception:
                # Never surface delivery failures to the client: a 500 here would
                # reveal that the address belongs to an account.
                logger.exception("Failed to send password reset email for user id=%s", user.pk)
        return Response(self.GENERIC_RESPONSE)


class ResetPasswordValidateView(APIView):
    """Check a reset link's uid/token before showing the new-password form."""

    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "password_reset_confirm"

    def post(self, request):
        serializer = ResetPasswordTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response({"valid": True})


class ResetPasswordConfirmView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "password_reset_confirm"
    serializer_class = ResetPasswordConfirmSerializer

    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        with transaction.atomic():
            # Changing the password hash also invalidates the reset token (no reuse).
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password", "updated_at"])
            revoke_all_refresh_tokens(user)
        return Response({"detail": "Password reset successful. You can now log in."})


class ChangePasswordView(APIView):
    """Change the authenticated user's password.

    All of the user's refresh tokens are blacklisted afterwards, so every session
    (including the current one) must log in again: the response says so via
    ``reauthentication_required``.
    """

    permission_classes = (permissions.IsAuthenticated,)
    throttle_classes = (ScopedRateThrottle,)
    throttle_scope = "password_change"
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        user = request.user
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            user.set_password(serializer.validated_data["new_password"])
            user.save(update_fields=["password", "updated_at"])
            revoke_all_refresh_tokens(user)
        return Response({
            "detail": "Password changed successfully. Please log in again with your new password.",
            "reauthentication_required": True,
        })


class ChangeEmailView(APIView):
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = ChangeEmailSerializer

    def post(self, request):
        user = request.user
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user.email = serializer.validated_data["new_email"].lower()
        user.save(update_fields=["email", "updated_at"])
        return Response({"detail": "Email changed successfully."})


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
