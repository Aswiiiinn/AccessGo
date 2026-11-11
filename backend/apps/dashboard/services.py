from django.contrib.auth import get_user_model
from django.db.models import Count
from apps.reports.models import AccessibilityReport
from apps.accessibility.models import AccessibilityLocation

User = get_user_model()


def get_dashboard_stats() -> dict:
    report_qs = AccessibilityReport.objects.all()
    impact_counts = dict(
        report_qs.values_list("accessibility_impact")
        .annotate(count=Count("id"))
        .values_list("accessibility_impact", "count")
    )
    return {
        "total_reports": report_qs.count(),
        "pending_reports": report_qs.filter(status="pending").count(),
        "verified_reports": report_qs.filter(status="verified").count(),
        "resolved_reports": report_qs.filter(status="resolved").count(),
        "total_locations": AccessibilityLocation.objects.filter(is_active=True).count(),
        "total_users": User.objects.count(),
        "reports_by_impact": impact_counts,
    }
