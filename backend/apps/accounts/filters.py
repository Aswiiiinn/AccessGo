import django_filters
from django.contrib.auth import get_user_model
from django.db.models import Q

from apps.reports.models import AccessibilityReport

User = get_user_model()


class AdminReportFilter(django_filters.FilterSet):
    status = django_filters.CharFilter(field_name="status", lookup_expr="iexact")
    category = django_filters.CharFilter(field_name="category", lookup_expr="iexact")
    severity = django_filters.CharFilter(field_name="accessibility_impact", lookup_expr="iexact")
    user = django_filters.NumberFilter(field_name="author_id")
    submitted_from = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    submitted_to = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = AccessibilityReport
        fields = ["status", "category", "severity", "user", "submitted_from", "submitted_to"]


class AdminUserFilter(django_filters.FilterSet):
    role = django_filters.CharFilter(field_name="role", lookup_expr="iexact")
    is_active = django_filters.BooleanFilter(field_name="is_active")

    class Meta:
        model = User
        fields = ["role", "is_active"]
