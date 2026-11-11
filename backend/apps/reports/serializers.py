from rest_framework import serializers
from .models import AccessibilityReport, ReportImage, ReportVerification


class ReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ("id", "image", "uploaded_at")
        read_only_fields = ("id", "uploaded_at")


class ReportImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()


class ReportVerificationSerializer(serializers.ModelSerializer):
    verifier = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ReportVerification
        fields = ("id", "verifier", "vote", "comment", "created_at", "updated_at")
        read_only_fields = ("id", "verifier", "created_at", "updated_at")


class AccessibilityReportSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    verification_count = serializers.SerializerMethodField()
    confirm_count = serializers.SerializerMethodField()
    dispute_count = serializers.SerializerMethodField()

    class Meta:
        model = AccessibilityReport
        fields = (
            "id", "author", "location", "title", "description",
            "category", "issue", "accessibility_impact", "status",
            "ai_classification", "images",
            "verification_count", "confirm_count", "dispute_count",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "author", "status", "ai_classification",
            "created_at", "updated_at",
        )

    def get_verification_count(self, obj):
        return obj.verifications.count()

    def get_confirm_count(self, obj):
        return sum(1 for v in obj.verifications.all() if v.vote == ReportVerification.Vote.CONFIRM)

    def get_dispute_count(self, obj):
        return sum(1 for v in obj.verifications.all() if v.vote == ReportVerification.Vote.DISPUTE)


class AdminReportStatusSerializer(serializers.ModelSerializer):
    """Used only by admins to update report status."""

    class Meta:
        model = AccessibilityReport
        fields = ("id", "status")
