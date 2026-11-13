"""The test suite must never spend real Gemini quota."""
from unittest import mock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from io import StringIO
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accessibility.models import AccessibilityLocation
from apps.reports.models import AccessibilityReport, ReportClassification

User = get_user_model()


class GeminiDisabledUnderTestsTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="ai@example.com", password="StrongPass1!")
        self.loc = AccessibilityLocation.objects.create(name="Station", latitude=51.5, longitude=-0.1)

    def test_flag_is_off_during_tests(self):
        self.assertFalse(settings.GEMINI_ENABLED)

    @mock.patch("google.genai.Client", side_effect=AssertionError("Gemini must not be called in tests"))
    def test_creating_report_does_not_call_gemini(self, client):
        self.client.force_authenticate(self.user)
        res = self.client.post(reverse("report-list"), {"location": self.loc.pk, "title": "Lift broken", "description": "Out of order"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        client.assert_not_called()
        c = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(c.classification_status, ReportClassification.Status.FAILED)
        self.assertIn("disabled", c.error_message)

    @mock.patch("ai_services.classifier.generate_classification_json")
    def test_reclassify_command_retries_failed(self, generate):
        generate.return_value = (
            '{"category": "elevator", "severity": "high", '
            '"keywords": ["lift"], "summary": "Lift out of order.", "confidence": 0.9}'
        )
        report = AccessibilityReport.objects.create(author=self.user, location=self.loc, title="Lift", description="Broken lift")
        ReportClassification.objects.create(report=report, classification_status=ReportClassification.Status.FAILED, error_message="Gemini rate limit exceeded.")
        out = StringIO()
        call_command("reclassify_reports", stdout=out)
        report.classification.refresh_from_db()
        self.assertEqual(report.classification.classification_status, ReportClassification.Status.COMPLETED, out.getvalue())
        self.assertEqual(report.classification.suggested_category, "elevator")
