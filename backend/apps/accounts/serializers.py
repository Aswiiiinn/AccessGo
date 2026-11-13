from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework import serializers

from apps.accessibility.models import AccessibilityLocation
from apps.reports.models import AccessibilityReport, ReportImage, ReportVerification

from .models import AdminReportReview, User

User = get_user_model()


INVALID_RESET_LINK_MESSAGE = "This password reset link is invalid, has expired, or has already been used."


def _validate_new_password_pair(attrs, user=None):
    """Shared check: confirmation matches and Django's AUTH_PASSWORD_VALIDATORS pass."""
    if attrs.get("new_password") != attrs.get("re_new_password"):
        raise serializers.ValidationError({"re_new_password": "Passwords do not match."})
    try:
        validate_password(attrs.get("new_password"), user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError({"new_password": list(exc.messages)})


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordTokenSerializer(serializers.Serializer):
    """Resolves a (uid, token) pair from a reset link to an active user.

    The resolved user is exposed as validated_data["user"]. Invalid, expired and
    already-used tokens all produce the same error so nothing about the account leaks.
    """

    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, attrs):
        try:
            user_pk = force_str(urlsafe_base64_decode(attrs["uid"]))
            user = User.objects.get(pk=user_pk, is_active=True)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({"token": INVALID_RESET_LINK_MESSAGE}, code="invalid_token")
        # default_token_generator embeds the password hash and last_login, so a token
        # stops working once the password changes (no reuse) and after
        # settings.PASSWORD_RESET_TIMEOUT seconds (expiry).
        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError({"token": INVALID_RESET_LINK_MESSAGE}, code="invalid_token")
        attrs["user"] = user
        return attrs


class ResetPasswordConfirmSerializer(ResetPasswordTokenSerializer):
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    re_new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        _validate_new_password_pair(attrs, user=attrs["user"])
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)
    re_new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate(self, attrs):
        _validate_new_password_pair(attrs, user=self.context["request"].user)
        return attrs


class ChangeEmailSerializer(serializers.Serializer):
    new_email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        user = self.context["request"].user
        if not user.check_password(attrs.get("password")):
            raise serializers.ValidationError({"password": "Current password is incorrect."})
        email = attrs.get("new_email")
        if User.objects.filter(email__iexact=email).exclude(pk=user.pk).exists():
            raise serializers.ValidationError({"new_email": "Email already in use."})
        return attrs


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
            "role", "is_superuser", "bio", "avatar", "created_at", "updated_at",
        )
        # email changes go through ChangeEmailView (password-confirmed);
        # role/is_superuser can only be changed by admins, never by the user.
        read_only_fields = ("id", "email", "role", "is_superuser", "created_at", "updated_at")

    MAX_AVATAR_BYTES = 2 * 1024 * 1024

    def validate_avatar(self, value):
        if value and value.size > self.MAX_AVATAR_BYTES:
            raise serializers.ValidationError("Profile picture must be 2 MB or smaller.")
        return value


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
