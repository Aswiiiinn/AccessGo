from django.conf import settings
from django.db import transaction, IntegrityError

from rest_framework.exceptions import ValidationError as DRFValidationError, PermissionDenied

from .models import AccessibilityReport, ReportClassification, ReportVerification, ReportImage
from .validators import validate_report_image


def create_report(author, validated_data: dict) -> AccessibilityReport:
    return AccessibilityReport.objects.create(author=author, **validated_data)


def update_report_status(report: AccessibilityReport, status: str) -> AccessibilityReport:
    report.status = status
    report.save(update_fields=["status", "updated_at"])
    return report


def _guard_report_open_for_verification(report: AccessibilityReport) -> None:
    """Rejected reports cannot receive new verifications."""
    if report.status == AccessibilityReport.Status.REJECTED:
        raise DRFValidationError(
            {"detail": "Rejected reports cannot receive new verifications."}
        )


@transaction.atomic
def add_verification(
    report: AccessibilityReport, verifier, vote: str, comment: str = ""
) -> ReportVerification:
    _guard_report_open_for_verification(report)
    try:
        verification = ReportVerification.objects.create(
            report=report,
            verifier=verifier,
            vote=vote,
            comment=comment,
        )
    except IntegrityError:
        raise DRFValidationError(
            {"detail": "You have already submitted a verification for this report."}
        )
    return verification


@transaction.atomic
def change_verification(
    report: AccessibilityReport, verifier, vote: str, comment: str = ""
) -> ReportVerification:
    """Update an existing verification vote. Raises 400 if none exists."""
    _guard_report_open_for_verification(report)
    updated = ReportVerification.objects.filter(
        report=report, verifier=verifier
    ).update(vote=vote, comment=comment)
    if not updated:
        raise DRFValidationError(
            {"detail": "No existing verification found. Submit a verification first."}
        )
    return ReportVerification.objects.get(report=report, verifier=verifier)


@transaction.atomic
def withdraw_verification(report: AccessibilityReport, verifier) -> None:
    """Delete the user's verification. Raises 400 if none exists."""
    deleted, _ = ReportVerification.objects.filter(
        report=report, verifier=verifier
    ).delete()
    if not deleted:
        raise DRFValidationError(
            {"detail": "No verification found to withdraw."}
        )


def add_image(report: AccessibilityReport, image_file) -> ReportImage:
    from django.core.exceptions import ValidationError as DjangoValidationError
    try:
        validate_report_image(image_file)
    except DjangoValidationError as exc:
        raise DRFValidationError({"image": exc.messages})
    return ReportImage.objects.create(report=report, image=image_file)


def delete_image(image: ReportImage) -> None:
    image.image.delete(save=False)
    image.delete()


def attach_ai_classification(
    report: AccessibilityReport, classification: dict
) -> AccessibilityReport:
    report.ai_classification = classification
    report.save(update_fields=["ai_classification", "updated_at"])
    return report


def classify_report_async(report: AccessibilityReport, force: bool = False):
    """Run classification safely without blocking request path on failures. Idempotent/no duplicates; reprocess updates same record."""
    try:
        from ai_services.classifier import (
            classify_report_text,
            ClassificationValidationError,
            GeminiAPIError,
            GeminiInvalidResponseError,
            GeminiRateLimitError,
            GeminiUnavailableError,
        )
    except Exception:
        return None

    classification, _ = ReportClassification.objects.get_or_create(
        report=report,
        defaults={"classification_status": ReportClassification.Status.PENDING},
    )
    if classification.classification_status == ReportClassification.Status.COMPLETED and not force:
        return classification

    # mark pending for (re)processing
    ReportClassification.objects.filter(pk=classification.pk).update(
        classification_status=ReportClassification.Status.PENDING,
        error_message="",
    )
    classification.refresh_from_db()

    allowed_categories = list(getattr(AccessibilityReport, "AI_SUGGESTED_CATEGORIES", []))
    if not allowed_categories:
        allowed_categories = ["elevator", "ramp", "tactile_paving", "accessible_toilet", "hearing_loop", "braille_signage", "step_free", "pathway", "entrance", "parking", "signage", "obstacle", "surface", "lighting", "other", "unknown"]

    try:
        result = classify_report_text(
            title=report.title or "",
            description=report.description or "",
            user_category=getattr(report, "category", "") or "",
            user_severity=getattr(report, "accessibility_impact", "") or "",
            allowed_categories=allowed_categories,
        )
        classification.suggested_category = result.get("suggested_category", "") or ""
        classification.suggested_severity = result.get("suggested_severity", "") or ""
        classification.keywords = result.get("keywords", []) or []
        classification.summary = result.get("summary", "") or ""
        classification.confidence_score = result.get("confidence_score")
        classification.ai_provider = "gemini"
        classification.model_name = getattr(settings, "GEMINI_MODEL", "") or ""
        classification.classification_status = ReportClassification.Status.COMPLETED
        classification.error_message = ""
        classification.save()
        try:
            attach_ai_classification(
                report,
                {
                    "suggested_category": classification.suggested_category,
                    "suggested_severity": classification.suggested_severity,
                    "keywords": classification.keywords,
                    "summary": classification.summary,
                    "confidence": classification.confidence_score,
                    "provider": "gemini",
                    "model": classification.model_name,
                    "status": classification.classification_status,
                },
            )
        except Exception:
            pass
        return classification
    except (GeminiRateLimitError, GeminiUnavailableError, GeminiInvalidResponseError, GeminiAPIError, ClassificationValidationError, ValueError) as exc:
        classification.classification_status = ReportClassification.Status.FAILED
        classification.error_message = str(exc)[:500]
        classification.save(update_fields=["classification_status", "error_message", "updated_at"])
        try:
            attach_ai_classification(report, {"status": "failed", "error": classification.error_message})
        except Exception:
            pass
        return classification
    except Exception as exc:
        classification.classification_status = ReportClassification.Status.FAILED
        classification.error_message = str(exc)[:500]
        classification.save(update_fields=["classification_status", "error_message", "updated_at"])
        try:
            attach_ai_classification(report, {"status": "failed", "error": classification.error_message})
        except Exception:
            pass
        return classification


def review_classification(report, user, action, reason=""):
    """Accept or reject an AI classification suggestion. Only author/admin may review."""
    from .classification_services import review_classification as _review
    return _review(report, user, action, reason)


def get_classification_reviews_for_report(report):
    from .classification_services import get_classification_reviews_for_report as _get
    return _get(report)


def create_potential_duplicates(report, max_candidates=5):
    from .duplicate_services import create_potential_duplicates as _create
    return _create(report, max_candidates=max_candidates)


def get_potential_duplicates_for_report(report):
    from .duplicate_services import get_potential_duplicates_for_report as _get
    return _get(report)


def review_duplicate(duplicate_id, admin_user, action, reason=""):
    from .duplicate_services import review_duplicate as _review
    return _review(duplicate_id, admin_user, action, reason)


def get_admin_duplicate_reports_queryset(status=None):
    from .duplicate_services import get_admin_duplicate_reports_queryset as _get
    return _get(status=status)
