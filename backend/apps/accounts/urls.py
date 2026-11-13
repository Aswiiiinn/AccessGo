from django.urls import path
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from .views import (
    AdminDashboardStatisticsView,
    AdminHighSeverityReportsView,
    AdminRejectReportView,
    AdminReportDetailView,
    AdminReportListView,
    AdminReportsByCategoryView,
    AdminReportsByStatusView,
    AdminReportsOverTimeView,
    AdminRequestInfoReportView,
    AdminResolveReportView,
    AdminUserDetailView,
    AdminUserListView,
    AdminUserStatusUpdateView,
    AdminVerifyReportView,
    ChangeEmailView,
    ChangePasswordView,
    ForgotPasswordView,
    ProfileView,
    RegisterView,
    ResetPasswordConfirmView,
    ResetPasswordValidateView,
)

urlpatterns = [
    # Auth
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("auth/profile/", ProfileView.as_view(), name="profile"),
    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("auth/reset-password/validate/", ResetPasswordValidateView.as_view(), name="reset-password-validate"),
    path("auth/reset-password/confirm/", ResetPasswordConfirmView.as_view(), name="reset-password-confirm"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("auth/change-email/", ChangeEmailView.as_view(), name="change-email"),

    # Admin dashboard/statistics
    path("dashboard/statistics/", AdminDashboardStatisticsView.as_view(), name="admin-dashboard-statistics"),

    # Admin report management
    path("dashboard/reports/", AdminReportListView.as_view(), name="admin-report-list"),
    path("dashboard/reports/<int:id>/", AdminReportDetailView.as_view(), name="admin-report-detail"),
    path("dashboard/reports/<int:id>/verify/", AdminVerifyReportView.as_view(), name="admin-report-verify"),
    path("dashboard/reports/<int:id>/reject/", AdminRejectReportView.as_view(), name="admin-report-reject"),
    path("dashboard/reports/<int:id>/resolve/", AdminResolveReportView.as_view(), name="admin-report-resolve"),
    path("dashboard/reports/<int:id>/request-info/", AdminRequestInfoReportView.as_view(), name="admin-report-request-info"),

    # Admin analytics
    path("dashboard/reports-by-category/", AdminReportsByCategoryView.as_view(), name="admin-reports-by-category"),
    path("dashboard/reports-by-status/", AdminReportsByStatusView.as_view(), name="admin-reports-by-status"),
    path("dashboard/reports-over-time/", AdminReportsOverTimeView.as_view(), name="admin-reports-over-time"),
    path("dashboard/high-severity-reports/", AdminHighSeverityReportsView.as_view(), name="admin-high-severity-reports"),

    # Admin user management
    path("dashboard/users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("dashboard/users/<int:id>/", AdminUserDetailView.as_view(), name="admin-user-detail"),
    path("dashboard/users/<int:id>/status/", AdminUserStatusUpdateView.as_view(), name="admin-user-status"),
]
