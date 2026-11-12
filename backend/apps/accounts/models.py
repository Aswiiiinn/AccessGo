from django.conf import settings
from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models


class AccessGoUserManager(UserManager):
    def create_user(self, username=None, email=None, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        email = self.normalize_email(email)
        username = username or email.split("@")[0]
        return super().create_user(username, email, password, **extra_fields)

    def create_superuser(self, username=None, email=None, password=None, **extra_fields):
        email = email or username
        username = username or (email.split("@")[0] if email else None)
        extra_fields.setdefault("role", "admin")
        return super().create_superuser(username, email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        USER = "user", "User"
        ADMIN = "admin", "Admin"

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.USER)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    objects = AccessGoUserManager()

    class Meta:
        indexes = [models.Index(fields=["role"])]

    @property
    def is_admin_user(self):
        return self.role == self.Role.ADMIN or self.is_superuser


class AdminReportReview(models.Model):
    class Action(models.TextChoices):
        VERIFY = "verify", "Verify"
        REJECT = "reject", "Reject"
        RESOLVE = "resolve", "Resolve"
        REQUEST_INFO = "request_info", "Request Info"

    report = models.ForeignKey(
        "reports.AccessibilityReport",
        on_delete=models.CASCADE,
        related_name="admin_reviews",
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="admin_report_reviews",
    )
    previous_status = models.CharField(max_length=20)
    new_status = models.CharField(max_length=20)
    action = models.CharField(max_length=20, choices=Action.choices)
    review_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["report", "created_at"]),
            models.Index(fields=["admin", "created_at"]),
            models.Index(fields=["action"]),
        ]

    def __str__(self):
        return f"{self.report_id} {self.action} by {self.admin_id}"
