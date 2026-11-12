from rest_framework import serializers
from .models import AccessibilityReport, ReportClassification, ReportImage, ReportVerification


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


class ReportClassificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportClassification
        fields = (
            "id", "report", "suggested_category", "suggested_severity",
            "keywords", "summary", "confidence_score",
            "ai_provider", "model_name", "classification_status",
            "error_message", "created_at", "updated_at",
        )
        read_only_fields = fields


class AccessibilityReportSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    verification_count = serializers.SerializerMethodField()
    confirm_count = serializers.SerializerMethodField()
    dispute_count = serializers.SerializerMethodField()
    classification = ReportClassificationSerializer(read_only=True)

    class Meta:
        model = AccessibilityReport
        fields = (
            "id", "author", "location", "title", "description",
            "category", "issue", "accessibility_impact", "status",
            "ai_classification", "classification", "images",
            "verification_count", "confirm_count", "dispute_count",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "author", "status", "ai_classification", "classification",
            "created_at", "updated_at",
        )

    def get_verification_count(self, obj):
        verifications = getattr(obj, "_prefetched_objects_cache", {}).get("verifications")
        if verifications is not None:
            return len(obj.verifications.all())
        return obj.verifications.count()

    def get_confirm_count(self, obj):
        verifications = getattr(obj, "_prefetched_objects_cache", {}).get("verifications")
        if verifications is not None:
            return sum(1 for v in obj.verifications.all() if v.vote == ReportVerification.Vote.CONFIRM)
        return obj.verifications.filter(vote=ReportVerification.Vote.CONFIRM).count()

    def get_dispute_count(self, obj):
        verifications = getattr(obj, "_prefetched_objects_cache", {}).get("verifications")
        if verifications is not None:
            return sum(1 for v in obj.verifications.all() if v.vote == ReportVerification.Vote.DISPUTE)
        return obj.verifications.filter(vote=ReportVerification.Vote.DISPUTE).count()


class AdminReportStatusSerializer(serializers.ModelSerializer):
    """Used only by admins to update report status."""

    class Meta:
        model = AccessibilityReport
        fields = ("id", "status")
