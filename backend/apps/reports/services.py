from django.db import transaction, IntegrityError
from rest_framework.exceptions import ValidationError as DRFValidationError, PermissionDenied
from .models import AccessibilityReport, ReportVerification, ReportImage
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
