from django.db import transaction, IntegrityError
from rest_framework.exceptions import ValidationError as DRFValidationError
from .models import AccessibilityReport, ReportVerification, ReportImage
from .validators import validate_report_image


def create_report(author, validated_data: dict) -> AccessibilityReport:
    return AccessibilityReport.objects.create(author=author, **validated_data)


def update_report_status(report: AccessibilityReport, status: str) -> AccessibilityReport:
    report.status = status
    report.save(update_fields=["status", "updated_at"])
    return report


@transaction.atomic
def add_verification(
    report: AccessibilityReport, verifier, vote: str, comment: str = ""
) -> ReportVerification:
    """
    Atomically creates a verification vote.
    Raises DRFValidationError if the user has already voted on this report.
    """
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
