from rest_framework import serializers
from .models import AccessibilityLocation, AccessibilityAttribute


class AccessibilityAttributeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccessibilityAttribute
        fields = ("id", "attribute_type", "is_available", "notes", "updated_at")


class AccessibilityLocationSerializer(serializers.ModelSerializer):
    attributes = AccessibilityAttributeSerializer(many=True, read_only=True)

    class Meta:
        model = AccessibilityLocation
        fields = (
            "id", "name", "location_type", "address",
            "latitude", "longitude", "description",
            "is_active", "attributes", "created_at", "updated_at",
        )
