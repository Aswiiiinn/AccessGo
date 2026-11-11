from rest_framework import serializers
from .models import AccessibilityReport, ReportImage, ReportVerification


class ReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ("id", "image", "uploaded_at")


class ReportVerificationSerializer(serializers.ModelSerializer):
    verifier = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ReportVerification
        fields = ("id", "verifier", "vote", "comment", "created_at")
        read_only_fields = ("id", "verifier", "created_at")


class AccessibilityReportSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    verification_count = serializers.SerializerMethodField()

    class Meta:
        model = AccessibilityReport
        fields = (
            "id", "author", "location", "title", "description",
            "category", "issue", "accessibility_impact", "status",
            "ai_classification", "images", "verification_count",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "author", "status", "ai_classification", "created_at", "updated_at")

    def get_verification_count(self, obj):
        return obj.verifications.count()
