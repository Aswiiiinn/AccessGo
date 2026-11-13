"""Re-run AI classification for reports whose classification failed or never ran.

    python manage.py reclassify_reports            # failed + pending (default)
    python manage.py reclassify_reports --ids 19 21
    python manage.py reclassify_reports --limit 5  # stay within a small daily quota
"""
from django.core.management.base import BaseCommand

from apps.reports.models import AccessibilityReport, ReportClassification
from apps.reports.services import classify_report_async


class Command(BaseCommand):
    help = "Retry AI classification for reports with failed or pending classifications."

    def add_arguments(self, parser):
        parser.add_argument("--ids", nargs="*", type=int, help="Only these report ids.")
        parser.add_argument("--limit", type=int, default=0, help="Maximum number of reports to process (0 = no limit).")

    def handle(self, *args, ids=None, limit=0, **options):
        qs = AccessibilityReport.objects.order_by("-created_at")
        if ids:
            qs = qs.filter(pk__in=ids)
        else:
            qs = qs.exclude(classification__classification_status=ReportClassification.Status.COMPLETED)
        if limit:
            qs = qs[:limit]

        done = failed = 0
        for report in qs:
            result = classify_report_async(report, force=True)
            status = getattr(result, "classification_status", "failed")
            if status == ReportClassification.Status.COMPLETED:
                done += 1
                self.stdout.write(self.style.SUCCESS(f"#{report.pk} classified"))
            else:
                failed += 1
                message = getattr(result, "error_message", "") or "unknown error"
                self.stdout.write(self.style.WARNING(f"#{report.pk} failed: {message}"))
                if "rate limit" in message.lower():
                    self.stdout.write(self.style.ERROR("Stopping: API quota exhausted. Try again after it resets."))
                    break
        self.stdout.write(f"Done: {done} classified, {failed} failed.")
