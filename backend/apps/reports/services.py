from .models import AccessibilityReport, ReportVerification


def create_report(author, validated_data: dict) -> AccessibilityReport:
    return AccessibilityReport.objects.create(author=author, **validated_data)


def update_report_status(report: AccessibilityReport, status: str) -> AccessibilityReport:
    report.status = status
    report.save(update_fields=["status", "updated_at"])
    return report


def add_verification(report: AccessibilityReport, verifier, vote: str, comment: str = "") -> ReportVerification:
    verification, _ = ReportVerification.objects.get_or_create(
        report=report,
        verifier=verifier,
        defaults={"vote": vote, "comment": comment},
    )
    return verification


def attach_ai_classification(report: AccessibilityReport, classification: dict) -> AccessibilityReport:
    report.ai_classification = classification
    report.save(update_fields=["ai_classification", "updated_at"])
    return report
