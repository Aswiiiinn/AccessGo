import logging

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import AccessibilityReport, ReportClassification, ClassificationReview

logger = logging.getLogger(__name__)


def _get_classification(report):
    try:
        return ReportClassification.objects.get(report=report)
    except ReportClassification.DoesNotExist:
        return None


def _validate_suggestion_values(classification):
    allowed_categories = list(getattr(AccessibilityReport, "AI_SUGGESTED_CATEGORIES", []))
    allowed_severities = ["low", "medium", "high", "critical"]
    cat = (classification.suggested_category or "").strip().lower()
    sev = (classification.suggested_severity or "").strip().lower()
    if cat and cat not in {c.lower() for c in allowed_categories}:
        raise ValidationError({"detail": "Suggested category is not allowed."})
    if sev and sev not in allowed_severities:
        raise ValidationError({"detail": "Suggested severity is not allowed."})


def review_classification(report, user, action, reason=""):
    if action not in (ClassificationReview.Action.ACCEPT, ClassificationReview.Action.REJECT):
        raise ValidationError({"detail": "Invalid action. Use 'accept' or 'reject'."})

    classification = _get_classification(report)
    if classification is None:
        raise ValidationError({"detail": "No classification available for this report."})

    if classification.classification_status != ReportClassification.Status.COMPLETED:
        raise ValidationError({"detail": "Classification is not completed yet."})

    with transaction.atomic():
        existing = ClassificationReview.objects.filter(
            report=report, action=action
        ).first()
        if existing is not None:
            return existing

        review = ClassificationReview.objects.create(
            report=report,
            classification=classification,
            reviewed_by=user,
            action=action,
            reason=reason or "",
        )

        if action == ClassificationReview.Action.ACCEPT:
            _validate_suggestion_values(classification)
            report.category = classification.suggested_category or report.category
            report.accessibility_impact = classification.suggested_severity or report.accessibility_impact
            report.save(update_fields=["category", "accessibility_impact", "updated_at"])

    return review


def get_classification_reviews_for_report(report):
    return ClassificationReview.objects.filter(report=report).select_related("reviewed_by").order_by("-created_at")