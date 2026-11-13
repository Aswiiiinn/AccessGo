"""GET /reports/?author=me — powers the "My Reports" page.

Reports are created through the ORM so no AI classification (external API) is triggered.
"""
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accessibility.models import AccessibilityLocation
from apps.reports.models import AccessibilityReport

User = get_user_model()
LIST_URL = reverse("report-list")


class MyReportsFilterTest(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(email="me@example.com", password="StrongPass1!")
        self.other = User.objects.create_user(email="other@example.com", password="StrongPass1!")
        loc = AccessibilityLocation.objects.create(name="Station", latitude=51.5, longitude=-0.1)
        for i in range(3):
            AccessibilityReport.objects.create(author=self.me, location=loc, title=f"Mine {i}", description="d")
        AccessibilityReport.objects.create(
            author=self.me, location=loc, title="Mine verified", description="d", status=AccessibilityReport.Status.VERIFIED
        )
        for i in range(25):
            AccessibilityReport.objects.create(author=self.other, location=loc, title=f"Theirs {i}", description="d")

    def test_returns_only_own_reports_across_all_pages(self):
        self.client.force_authenticate(self.me)
        res = self.client.get(LIST_URL, {"author": "me"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 4)
        self.assertTrue(all(r["author"] == "me@example.com" for r in res.data["results"]))

    def test_combines_with_status_filter(self):
        self.client.force_authenticate(self.me)
        res = self.client.get(LIST_URL, {"author": "me", "status": "verified"})
        self.assertEqual(res.data["count"], 1)
        self.assertEqual(res.data["results"][0]["title"], "Mine verified")

    def test_anonymous_gets_empty_list(self):
        res = self.client.get(LIST_URL, {"author": "me"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["count"], 0)

    def test_without_param_lists_everyone(self):
        self.client.force_authenticate(self.me)
        res = self.client.get(LIST_URL)
        self.assertEqual(res.data["count"], 29)


class DuplicateReviewTest(APITestCase):
    """POST /reports/duplicate-reports/{id}/review/ with action=confirm|dismiss."""

    def setUp(self):
        from apps.reports.models import PotentialDuplicate

        self.admin = User.objects.create_user(email="admin@example.com", password="StrongPass1!", role="admin")
        self.user = User.objects.create_user(email="u@example.com", password="StrongPass1!")
        loc = AccessibilityLocation.objects.create(name="Station", latitude=51.5, longitude=-0.1)
        a = AccessibilityReport.objects.create(author=self.user, location=loc, title="Lift broken", description="d")
        b = AccessibilityReport.objects.create(author=self.user, location=loc, title="Lift broken again", description="d")
        self.dup = PotentialDuplicate.objects.create(source_report=b, matched_report=a, similarity_score=0.9)

    def url(self):
        return reverse("admin-duplicate-review", args=[self.dup.pk])

    def test_admin_can_confirm(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url(), {"action": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["status"], "confirmed")

    def test_admin_can_dismiss(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url(), {"action": "dismiss", "reason": "Different floors"})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["status"], "dismissed")

    def test_invalid_action_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post(self.url(), {"action": "confirmed"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_admin_forbidden(self):
        self.client.force_authenticate(self.user)
        res = self.client.post(self.url(), {"action": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_and_filter(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(reverse("admin-duplicate-reports"))
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["count"], 1)
        res = self.client.get(reverse("admin-duplicate-reports"), {"status": "suggested"})
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)
        self.assertEqual(res.data["results"][0]["matched_report_title"], "Lift broken")
        res = self.client.get(reverse("admin-duplicate-reports"), {"status": "dismissed"})
        self.assertEqual(res.data["count"], 0)

    def test_report_detail_route_still_works(self):
        res = self.client.get(reverse("report-detail", args=[self.dup.source_report_id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
