from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.accessibility.models import AccessibilityLocation
from .models import AccessibilityReport, ReportVerification
from .services import create_report, add_verification

User = get_user_model()


class ReportServiceTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="reporter", password="pass1234!")
        self.location = AccessibilityLocation.objects.create(
            name="Test Station", latitude=51.5, longitude=-0.1, location_type="station"
        )

    def test_create_report(self):
        report = create_report(self.user, {
            "location": self.location,
            "title": "Broken elevator",
            "description": "Elevator is out of service.",
        })
        self.assertEqual(report.status, AccessibilityReport.Status.PENDING)
        self.assertEqual(report.author, self.user)

    def test_duplicate_verification_not_created(self):
        report = create_report(self.user, {
            "location": self.location,
            "title": "Broken ramp",
            "description": "Ramp is blocked.",
        })
        verifier = User.objects.create_user(username="verifier", password="pass1234!")
        add_verification(report, verifier, "confirm")
        add_verification(report, verifier, "confirm")
        self.assertEqual(ReportVerification.objects.filter(report=report).count(), 1)
