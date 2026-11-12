from django.db import models
from django.conf import settings
from apps.accessibility.models import AccessibilityLocation


class AccessibilityReport(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"
        RESOLVED = "resolved", "Resolved"

    class ImpactLevel(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    # No fixed DB choices for category in existing model; AI suggestions validated against this set.
    AI_SUGGESTED_CATEGORIES = (
        "elevator",
        "ramp",
        "tactile_paving",
        "accessible_toilet",
        "hearing_loop",
        "braille_signage",
        "step_free",
        "pathway",
        "entrance",
        "parking",
        "signage",
        "obstacle",
        "surface",
        "lighting",
        "other",
        "unknown",
    )

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports"
    )
    location = models.ForeignKey(
        AccessibilityLocation, on_delete=models.CASCADE, related_name="reports"
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, blank=True)
    issue = models.CharField(max_length=100, blank=True)
    accessibility_impact = models.CharField(
        max_length=10, choices=ImpactLevel.choices, default=ImpactLevel.MEDIUM
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    ai_classification = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["author"]),
            models.Index(fields=["location"]),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class ReportClassification(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    report = models.OneToOneField(
        AccessibilityReport, on_delete=models.CASCADE, related_name="classification"
    )
    suggested_category = models.CharField(max_length=50, blank=True)
    suggested_severity = models.CharField(max_length=10, blank=True)
    keywords = models.JSONField(default=list, blank=True)
    summary = models.TextField(blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    ai_provider = models.CharField(max_length=50, blank=True)
    model_name = models.CharField(max_length=100, blank=True)
    classification_status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["classification_status"]),
            models.Index(fields=["report"]),
        ]

    def __str__(self):
        return f"Classification for report {self.report_id} ({self.classification_status})"


class ReportImage(models.Model):
    report = models.ForeignKey(AccessibilityReport, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to="reports/")
    uploaded_at = models.DateTimeField(auto_now_add=True)


class ReportVerification(models.Model):
    class Vote(models.TextChoices):
        CONFIRM = "confirm", "Confirm"
        DISPUTE = "dispute", "Dispute"

    report = models.ForeignKey(AccessibilityReport, on_delete=models.CASCADE, related_name="verifications")
    verifier = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="verifications"
    )
    vote = models.CharField(max_length=10, choices=Vote.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("report", "verifier")
