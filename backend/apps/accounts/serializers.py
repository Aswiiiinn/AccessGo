from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ("id", "email", "username", "full_name", "password")
        read_only_fields = ("id",)
        extra_kwargs = {
            "username": {"required": False},
            "email": {"required": True},
        }

    def create(self, validated_data):
        # username defaults to the part before @ if not provided
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
