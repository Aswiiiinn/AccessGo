from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import models
from django.db import transaction
from django.db.models import Q
from django.db.models import Count
from django.db.models.functions import TruncDay, TruncMonth
from rest_framework.exceptions import ValidationError

from apps.accessibility.models import AccessibilityLocation
from apps.reports.models import AccessibilityReport, ReportVerification, ReportClassification

from .models import AdminReportReview

User = get_user_model()


def get_admin_dashboard_statistics():
    report_qs = AccessibilityReport.objects.all()
    verification_qs = ReportVerification.objects.all()
    counts = report_qs.aggregate(
        total_reports=Count("id"),
        pending_reports=Count("id", filter=Q(status=AccessibilityReport.Status.PENDING)),
        verified_reports=Count("id", filter=Q(status=AccessibilityReport.Status.VERIFIED)),
        rejected_reports=Count("id", filter=Q(status=AccessibilityReport.Status.REJECTED)),
        resolved_reports=Count("id", filter=Q(status=AccessibilityReport.Status.RESOLVED)),
        high_severity_reports=Count(
            "id",
            filter=Q(
                accessibility_impact__in=[
                    AccessibilityReport.ImpactLevel.HIGH,
                    AccessibilityReport.ImpactLevel.CRITICAL,
                ]
            ),
        ),
    )
    vcounts = verification_qs.aggregate(
        total_positive_verifications=Count(
            "id", filter=Q(vote=ReportVerification.Vote.CONFIRM)
        ),
        total_negative_verifications=Count(
            "id", filter=Q(vote=ReportVerification.Vote.DISPUTE)
        ),
    )
    return {
        **counts,
        "total_registered_users": User.objects.count(),
        "total_accessibility_locations": AccessibilityLocation.objects.count(),
        **vcounts,
    }


def get_admin_reports_queryset():
    return (
        AccessibilityReport.objects.select_related("author", "location", "classification")
        .prefetch_related("images", "verifications", "admin_reviews__admin")
        .annotate(
            image_count_agg=Count("images", distinct=True),
            positive_verification_count=Count(
                "verifications",
                filter=Q(verifications__vote=ReportVerification.Vote.CONFIRM),
                distinct=True,
            ),
            negative_verification_count=Count(
                "verifications",
                filter=Q(verifications__vote=ReportVerification.Vote.DISPUTE),
                distinct=True,
            ),
        )
        .order_by("-created_at")
    )


def get_admin_report_detail_queryset():
    return get_admin_reports_queryset()


def _transition_report(report, admin_user, action, new_status, review_comment=""):
    previous_status = report.status
    with transaction.atomic():
        if not (action == AdminReportReview.Action.REQUEST_INFO and previous_status == new_status):
            report.status = new_status
            report.save(update_fields=["status", "updated_at"])
        AdminReportReview.objects.create(
            report=report,
            admin=admin_user,
            previous_status=previous_status,
            new_status=new_status,
            action=action,
            review_comment=review_comment or "",
        )
    return report


def verify_report(report, admin_user, review_comment=""):
    if report.status != AccessibilityReport.Status.PENDING:
        raise ValidationError({"detail": "Only pending reports can be verified."})
    return _transition_report(
        report, admin_user, AdminReportReview.Action.VERIFY, AccessibilityReport.Status.VERIFIED, review_comment
    )


def reject_report(report, admin_user, review_comment):
    if report.status != AccessibilityReport.Status.PENDING:
        raise ValidationError({"detail": "Only pending reports can be rejected."})
    if not review_comment or not str(review_comment).strip():
        raise ValidationError({"review_comment": "Rejection reason is required."})
    return _transition_report(
        report, admin_user, AdminReportReview.Action.REJECT, AccessibilityReport.Status.REJECTED, review_comment
    )


def resolve_report(report, admin_user, review_comment=""):
    if report.status != AccessibilityReport.Status.VERIFIED:
        raise ValidationError({"detail": "Only verified reports can be resolved."})
    return _transition_report(
        report, admin_user, AdminReportReview.Action.RESOLVE, AccessibilityReport.Status.RESOLVED, review_comment
    )


def request_report_info(report, admin_user, review_comment=""):
    if report.status != AccessibilityReport.Status.PENDING:
        raise ValidationError({"detail": "Only pending reports can request additional information."})
    return _transition_report(
        report,
        admin_user,
        AdminReportReview.Action.REQUEST_INFO,
        AccessibilityReport.Status.PENDING,
        review_comment,
    )


def get_reports_by_category():
    return list(
        AccessibilityReport.objects.values("category")
        .annotate(count=Count("id"))
        .order_by("category")
    )


def get_reports_by_status():
    return list(
        AccessibilityReport.objects.values("status")
        .annotate(count=Count("id"))
        .order_by("status")
    )


def get_reports_over_time(group="day"):
    if group == "month":
        qs = AccessibilityReport.objects.annotate(period=TruncMonth("created_at"))
    else:
        group = "day"
        qs = AccessibilityReport.objects.annotate(period=TruncDay("created_at"))
    data = (
        qs.values("period")
        .annotate(count=Count("id"))
        .order_by("period")
    )
    result = []
    for row in data:
        period = row["period"]
        result.append({"period": period.date().isoformat() if period else None, "count": row["count"]})
    return {"group": group, "results": result}


def get_high_severity_pending_reports():
    return (
        AccessibilityReport.objects.filter(
            status=AccessibilityReport.Status.PENDING,
            accessibility_impact__in=[
                AccessibilityReport.ImpactLevel.HIGH,
                AccessibilityReport.ImpactLevel.CRITICAL,
            ],
        )
        .select_related("author", "location")
        .annotate(
            positive_verification_count=Count(
                "verifications",
                filter=Q(verifications__vote=ReportVerification.Vote.CONFIRM),
                distinct=True,
            ),
            negative_verification_count=Count(
                "verifications",
                filter=Q(verifications__vote=ReportVerification.Vote.DISPUTE),
                distinct=True,
            ),
        )
        .order_by("-created_at")
    )


def get_admin_users_queryset():
    return User.objects.all().order_by("-date_joined", "-id")


def get_admin_user_detail_queryset():
    return User.objects.prefetch_related(
        "reports__location",
        "reports__images",
        "reports__verifications",
    )


def update_user_account_status(target_user, acting_admin, is_active):
    if target_user.pk == acting_admin.pk and not is_active:
        raise ValidationError({"detail": "You cannot deactivate your own account."})
    target_user.is_active = bool(is_active)
    target_user.save(update_fields=["is_active"])
    return target_user

def revoke_all_refresh_tokens(user):
    """Blacklist every outstanding Simple JWT refresh token issued to ``user``.

    Used after a password change/reset so that sessions on other devices cannot
    keep minting access tokens. Already-issued access tokens stay valid until they
    expire (SIMPLE_JWT["ACCESS_TOKEN_LIFETIME"]).
    """
    from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

    outstanding = OutstandingToken.objects.filter(user=user).exclude(blacklistedtoken__isnull=False)
    BlacklistedToken.objects.bulk_create(
        [BlacklistedToken(token=token) for token in outstanding],
        ignore_conflicts=True,
    )
