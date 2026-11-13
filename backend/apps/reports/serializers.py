from rest_framework import serializers
from .models import AccessibilityReport, ReportClassification, ReportImage, ReportVerification, ClassificationReview, PotentialDuplicate


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


class ClassificationReviewSerializer(serializers.ModelSerializer):
    reviewed_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = ClassificationReview
        fields = ("id", "report", "classification", "reviewed_by", "action", "reason", "created_at")
        read_only_fields = fields


class ClassificationReviewRequestSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=[("accept", "Accept"), ("reject", "Reject")])
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class PotentialDuplicateSerializer(serializers.ModelSerializer):
    source_report = serializers.PrimaryKeyRelatedField(read_only=True)
    matched_report = serializers.PrimaryKeyRelatedField(read_only=True)
    reviewed_by = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = PotentialDuplicate
        fields = (
            "id", "source_report", "matched_report", "similarity_score",
            "detection_method", "status", "reviewed_by", "reviewed_at",
            "created_at", "updated_at",
        )
        read_only_fields = fields


class PotentialDuplicateListSerializer(PotentialDuplicateSerializer):
    source_report_title = serializers.CharField(source="source_report.title", read_only=True)
    matched_report_title = serializers.CharField(source="matched_report.title", read_only=True)
    source_report_author = serializers.StringRelatedField(source="source_report.author", read_only=True)
    matched_report_author = serializers.StringRelatedField(source="matched_report.author", read_only=True)

    class Meta(PotentialDuplicateSerializer.Meta):
        fields = PotentialDuplicateSerializer.Meta.fields + (
            "source_report_title", "matched_report_title",
            "source_report_author", "matched_report_author",
        )


class PotentialDuplicateReviewRequestSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=[("confirm", "Confirm"), ("dismiss", "Dismiss")])
    reason = serializers.CharField(required=False, allow_blank=True, default="")


class AccessibilityLocationSummarySerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    class Meta:
        model = AccessibilityReport  # placeholder, replaced below
        fields = ("id", "name", "location_type", "address", "latitude", "longitude")


class ReportLocationSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    location_type = serializers.CharField()
    address = serializers.CharField()
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()


class AccessibilityReportSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField(read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    verification_count = serializers.SerializerMethodField()
    confirm_count = serializers.SerializerMethodField()
    dispute_count = serializers.SerializerMethodField()
    classification = ReportClassificationSerializer(read_only=True)
    location_detail = serializers.SerializerMethodField()

    class Meta:
        model = AccessibilityReport
        fields = (
            "id", "author", "location", "location_detail", "title", "description",
            "category", "issue", "accessibility_impact", "status",
            "ai_classification", "classification", "images",
            "verification_count", "confirm_count", "dispute_count",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "author", "status", "ai_classification", "classification",
            "created_at", "updated_at",
        )

    def get_location_detail(self, obj):
        loc = obj.location
        if not loc:
            return None
        return {
            "id": loc.id,
            "name": loc.name,
            "location_type": loc.location_type,
            "address": loc.address,
            "latitude": float(loc.latitude),
            "longitude": float(loc.longitude),
        }

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
