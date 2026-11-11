import django_filters
from .models import AccessibilityLocation


class AccessibilityLocationFilter(django_filters.FilterSet):
    location_type = django_filters.ChoiceFilter(choices=AccessibilityLocation.LocationType.choices)
    is_active = django_filters.BooleanFilter()

    class Meta:
        model = AccessibilityLocation
        fields = ("location_type", "is_active")
