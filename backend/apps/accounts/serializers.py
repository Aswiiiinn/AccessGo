from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accessibility.models import AccessibilityLocation
from apps.reports.models import AccessibilityReport, ReportImage, ReportVerification

from .models import AdminReportReview, User

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ("id", "email", "username", "full_name", "password")
        read_only_fields = ("id",)
        extra_kwargs = {
            "username": {"required": False},
            "email": {"required": True},
        }

    def create(self, validated_data):
        if not validated_data.get("username"):
            validated_data["username"] = validated_data["email"].split("@")[0]
        return User.objects.create_user(**validated_data)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "username", "full_name",
            "role", "bio", "avatar", "created_at", "updated_at",
        )
        read_only_fields = ("id", "email", "role", "created_at", "updated_at")


class DashboardStatisticsSerializer(serializers.Serializer):
    total_reports = serializers.IntegerField()
    pending_reports = serializers.IntegerField()
    verified_reports = serializers.IntegerField()
    rejected_reports = serializers.IntegerField()
    resolved_reports = serializers.IntegerField()
    high_severity_reports = serializers.IntegerField()
    total_registered_users = serializers.IntegerField()
    total_accessibility_locations = serializers.IntegerField()
    total_positive_verifications = serializers.IntegerField()
    total_negative_verifications = serializers.IntegerField()


class AdminReportCreatorSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "username", "full_name", "role")


class AdminReportLocationSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()

    class Meta:
        model = AccessibilityLocation
        fields = ("id", "name", "location_type", "address", "latitude", "longitude")


class AdminReportReviewSerializer(serializers.ModelSerializer):
    admin = AdminReportCreatorSerializer(read_only=True)

    class Meta:
        model = AdminReportReview
        fields = (
            "id", "admin", "previous_status", "new_status",
            "action", "review_comment", "created_at",
        )


class AdminReportVerificationSerializer(serializers.ModelSerializer):
    verifier = AdminReportCreatorSerializer(read_only=True)

    class Meta:
        model = ReportVerification
        fields = ("id", "verifier", "vote", "comment", "created_at", "updated_at")


class AdminReportImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportImage
        fields = ("id", "image", "uploaded_at")


class AdminReportListSerializer(serializers.ModelSerializer):
    creator = AdminReportCreatorSerializer(source="author", read_only=True)
    location_coordinates = serializers.SerializerMethodField()
    image_count = serializers.SerializerMethodField()
    positive_verification_count = serializers.IntegerField(read_only=True)
    negative_verification_count = serializers.IntegerField(read_only=True)
    severity = serializers.CharField(source="accessibility_impact")
    creation_timestamp = serializers.DateTimeField(source="created_at")

    class Meta:
        model = AccessibilityReport
        fields = (
            "id", "title", "description", "category", "severity", "status",
            "creator", "location_coordinates", "image_count",
            "positive_verification_count", "negative_verification_count",
            "creation_timestamp",
        )

    def get_location_coordinates(self, obj):
        loc = obj.location
        if not loc:
            return None
        return {"latitude": float(loc.latitude), "longitude": float(loc.longitude), "location_id": loc.id, "location_name": loc.name}

    def get_image_count(self, obj):
        annotated = getattr(obj, "image_count_agg", None)
        if annotated is not None:
            return annotated
        return obj.images.count()


class AdminReportDetailSerializer(AdminReportListSerializer):
    location = AdminReportLocationSerializer(read_only=True)
    uploaded_photographs = AdminReportImageSerializer(source="images", many=True, read_only=True)
    community_verification_records = AdminReportVerificationSerializer(
        source="verifications", many=True, read_only=True
    )
    administrative_review_history = AdminReportReviewSerializer(
        source="admin_reviews", many=True, read_only=True
    )

    class Meta(AdminReportListSerializer.Meta):
        fields = (
            "id", "title", "description", "category", "issue", "severity", "status",
            "creator", "location", "location_coordinates",
            "uploaded_photographs", "image_count",
            "community_verification_records",
            "positive_verification_count", "negative_verification_count",
            "administrative_review_history",
            "ai_classification", "creation_timestamp", "updated_at",
        )


class AdminReportModerationSerializer(serializers.Serializer):
    review_comment = serializers.CharField(required=False, allow_blank=True, default="")


class AdminRejectReportSerializer(serializers.Serializer):
    review_comment = serializers.CharField(required=True, allow_blank=False, trim_whitespace=True)


class AdminReportByCategorySerializer(serializers.Serializer):
    category = serializers.CharField(allow_blank=True, allow_null=True)
    count = serializers.IntegerField()


class AdminReportByStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    count = serializers.IntegerField()


class AdminReportsOverTimePointSerializer(serializers.Serializer):
    period = serializers.CharField(allow_null=True)
    count = serializers.IntegerField()


class AdminReportsOverTimeSerializer(serializers.Serializer):
    group = serializers.CharField()
    results = AdminReportsOverTimePointSerializer(many=True)


class AdminUserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id", "email", "username", "full_name", "role",
            "is_active", "date_joined", "created_at",
        )
        read_only_fields = fields


class AdminUserSubmittedReportSerializer(serializers.ModelSerializer):
    positive_verification_count = serializers.SerializerMethodField()
    negative_verification_count = serializers.SerializerMethodField()

    class Meta:
        model = AccessibilityReport
        fields = (
            "id", "title", "status", "category", "accessibility_impact",
            "created_at", "positive_verification_count", "negative_verification_count",
        )

    def get_positive_verification_count(self, obj):
        verifications = getattr(obj, "_prefetched_objects_cache", {}).get("verifications")
        if verifications is not None:
            return sum(1 for v in obj.verifications.all() if v.vote == ReportVerification.Vote.CONFIRM)
        return obj.verifications.filter(vote=ReportVerification.Vote.CONFIRM).count()

    def get_negative_verification_count(self, obj):
        verifications = getattr(obj, "_prefetched_objects_cache", {}).get("verifications")
        if verifications is not None:
            return sum(1 for v in obj.verifications.all() if v.vote == ReportVerification.Vote.DISPUTE)
        return obj.verifications.filter(vote=ReportVerification.Vote.DISPUTE).count()


class AdminUserDetailSerializer(AdminUserListSerializer):
    submitted_reports = AdminUserSubmittedReportSerializer(source="reports", many=True, read_only=True)
    registration_date = serializers.DateTimeField(source="date_joined", read_only=True)

    class Meta(AdminUserListSerializer.Meta):
        fields = AdminUserListSerializer.Meta.fields + ("bio", "registration_date", "submitted_reports")


class AdminUserStatusUpdateSerializer(serializers.Serializer):
    is_active = serializers.BooleanField()
