import io
from PIL import Image as PilImage
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from apps.accessibility.models import AccessibilityLocation
from .models import AccessibilityReport, ReportImage, ReportVerification

User = get_user_model()
LOGIN_URL = reverse("token_obtain_pair")


# ── helpers ──────────────────────────────────────────────────────────────────

def get_token(client, email, password):
    res = client.post(LOGIN_URL, {"email": email, "password": password})
    return res.data["access"]


def make_image(name="photo.jpg", fmt="JPEG", size=(10, 10), content_type="image/jpeg"):
    buf = io.BytesIO()
    PilImage.new("RGB", size, color=(100, 100, 100)).save(buf, format=fmt)
    buf.seek(0)
    return SimpleUploadedFile(name, buf.read(), content_type=content_type)


def make_location(**kwargs):
    defaults = dict(name="Station", latitude=51.5, longitude=-0.1, location_type="station")
    defaults.update(kwargs)
    return AccessibilityLocation.objects.create(**defaults)


# ── Report CRUD ───────────────────────────────────────────────────────────────

class ReportCRUDTest(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(email="author@example.com", password="Pass1234!")
        self.other  = User.objects.create_user(email="other@example.com",  password="Pass1234!")
        self.location = make_location()
        self.author_token = get_token(self.client, "author@example.com", "Pass1234!")
        self.other_token  = get_token(self.client, "other@example.com",  "Pass1234!")
        self.list_url = reverse("report-list")

    def _detail(self, pk):
        return reverse("report-detail", args=[pk])

    def _create(self, token=None, **overrides):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token or self.author_token}")
        payload = dict(
            location=self.location.pk,
            title="Broken elevator",
            description="Out of service.",
            accessibility_impact="high",
        )
        payload.update(overrides)
        return self.client.post(self.list_url, payload)

    # create
    def test_authenticated_user_can_create_report(self):
        res = self._create()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Broken elevator")
        self.assertEqual(res.data["status"], "pending")
        self.assertIn("images", res.data)
        self.assertIn("verification_count", res.data)

    def test_unauthenticated_cannot_create(self):
        self.client.credentials()
        res = self.client.post(self.list_url, {
            "location": self.location.pk, "title": "T", "description": "D"
        })
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_required_fields_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(self.list_url, {"title": "No location"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # read
    def test_anyone_can_list_reports(self):
        self._create()
        self.client.credentials()
        res = self.client.get(self.list_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn("results", res.data)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_anyone_can_retrieve_report(self):
        pk = self._create().data["id"]
        self.client.credentials()
        res = self.client.get(self._detail(pk))
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    # update
    def test_author_can_update_own_report(self):
        pk = self._create().data["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.patch(self._detail(pk), {"title": "Updated"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["title"], "Updated")

    def test_other_user_cannot_update_report(self):
        pk = self._create().data["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_token}")
        res = self.client.patch(self._detail(pk), {"title": "Hacked"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_cannot_change_status(self):
        pk = self._create().data["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.patch(self._detail(pk), {"status": "verified"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "pending")

    def test_author_cannot_change_ai_classification(self):
        pk = self._create().data["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.patch(
            self._detail(pk),
            {"ai_classification": {"category": "hacked"}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsNone(res.data["ai_classification"])

    # delete
    def test_author_can_delete_own_report(self):
        pk = self._create().data["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.delete(self._detail(pk))
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)

    def test_other_user_cannot_delete_report(self):
        pk = self._create().data["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_token}")
        res = self.client.delete(self._detail(pk))
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # filters
    def test_filter_by_status(self):
        self._create()
        self.client.credentials()
        res = self.client.get(self.list_url, {"status": "pending"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for r in res.data["results"]:
            self.assertEqual(r["status"], "pending")

    def test_search_by_title(self):
        self._create()
        self.client.credentials()
        res = self.client.get(self.list_url, {"search": "Broken elevator"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(res.data["count"], 1)

    def test_filter_by_impact(self):
        self._create()
        self.client.credentials()
        res = self.client.get(self.list_url, {"accessibility_impact": "high"})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        for r in res.data["results"]:
            self.assertEqual(r["accessibility_impact"], "high")


# ── Image upload ──────────────────────────────────────────────────────────────

class ReportImageUploadTest(APITestCase):
    def setUp(self):
        self.author = User.objects.create_user(email="imgauthor@example.com", password="Pass1234!")
        self.other  = User.objects.create_user(email="imgother@example.com",  password="Pass1234!")
        self.location = make_location(name="Bus Stop", location_type="bus_stop")
        self.author_token = get_token(self.client, "imgauthor@example.com", "Pass1234!")
        self.other_token  = get_token(self.client, "imgother@example.com",  "Pass1234!")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(reverse("report-list"), {
            "location": self.location.pk,
            "title": "Blocked ramp",
            "description": "Ramp blocked.",
        })
        self.report_id = res.data["id"]
        self.upload_url = reverse("report-images", args=[self.report_id])

    def test_author_can_upload_jpeg(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(self.upload_url, {"image": make_image()}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", res.data)
        self.assertIn("image", res.data)
        self.assertEqual(ReportImage.objects.filter(report_id=self.report_id).count(), 1)

    def test_author_can_upload_png(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(
            self.upload_url,
            {"image": make_image(name="photo.png", fmt="PNG", content_type="image/png")},
            format="multipart",
        )
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_other_user_cannot_upload(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_token}")
        res = self.client.post(self.upload_url, {"image": make_image()}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_cannot_upload(self):
        self.client.credentials()
        res = self.client.post(self.upload_url, {"image": make_image()}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_upload_without_file_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(self.upload_url, {}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_invalid_extension_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        bad_file = SimpleUploadedFile("doc.pdf", b"fake", content_type="application/pdf")
        res = self.client.post(self.upload_url, {"image": bad_file}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_oversized_image_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        big = SimpleUploadedFile(
            "big.jpg", b"x" * (6 * 1024 * 1024), content_type="image/jpeg"
        )
        res = self.client.post(self.upload_url, {"image": big}, format="multipart")
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_uploaded_image_appears_in_report_detail(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        self.client.post(self.upload_url, {"image": make_image()}, format="multipart")
        self.client.credentials()
        res = self.client.get(reverse("report-detail", args=[self.report_id]))
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data["images"]), 1)

    def test_author_can_delete_image(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        upload_res = self.client.post(self.upload_url, {"image": make_image()}, format="multipart")
        image_id = upload_res.data["id"]
        delete_url = reverse("report-image-detail", args=[self.report_id, image_id])
        res = self.client.delete(delete_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ReportImage.objects.filter(pk=image_id).exists())

    def test_other_user_cannot_delete_image(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        upload_res = self.client.post(self.upload_url, {"image": make_image()}, format="multipart")
        image_id = upload_res.data["id"]
        delete_url = reverse("report-image-detail", args=[self.report_id, image_id])
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_token}")
        res = self.client.delete(delete_url)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_nonexistent_image_returns_404(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        delete_url = reverse("report-image-detail", args=[self.report_id, 99999])
        res = self.client.delete(delete_url)
        self.assertEqual(res.status_code, status.HTTP_404_NOT_FOUND)


# ── Verification ──────────────────────────────────────────────────────────────

class ReportVerificationTest(APITestCase):
    def setUp(self):
        self.author   = User.objects.create_user(email="vauthor@example.com",   password="Pass1234!")
        self.verifier = User.objects.create_user(email="vverifier@example.com", password="Pass1234!")
        self.other    = User.objects.create_user(email="vother@example.com",    password="Pass1234!")
        self.location = make_location(name="Entrance", location_type="entrance")
        self.author_token   = get_token(self.client, "vauthor@example.com",   "Pass1234!")
        self.verifier_token = get_token(self.client, "vverifier@example.com", "Pass1234!")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(reverse("report-list"), {
            "location": self.location.pk,
            "title": "No tactile paving",
            "description": "Missing at entrance.",
        })
        self.report_id = res.data["id"]
        self.verify_url = reverse("report-verify", args=[self.report_id])

    def test_verifier_can_confirm(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["vote"], "confirm")

    def test_verifier_can_dispute(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.post(self.verify_url, {"vote": "dispute", "comment": "Not accurate."})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["vote"], "dispute")

    def test_author_cannot_verify_own_report(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_verification_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ReportVerification.objects.filter(report_id=self.report_id).count(), 1)

    def test_unauthenticated_cannot_verify(self):
        self.client.credentials()
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_vote_value_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.post(self.verify_url, {"vote": "invalid"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_verification_count_increments(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        self.client.credentials()
        res = self.client.get(reverse("report-detail", args=[self.report_id]))
        self.assertEqual(res.data["verification_count"], 1)


# ── Service layer ─────────────────────────────────────────────────────────────

class ReportServiceTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="svc@example.com", password="pass1234!")
        self.location = make_location()

    def test_create_report_sets_pending_status(self):
        from .services import create_report
        report = create_report(self.user, {
            "location": self.location,
            "title": "Broken elevator",
            "description": "Out of service.",
        })
        self.assertEqual(report.status, AccessibilityReport.Status.PENDING)
        self.assertEqual(report.author, self.user)

    def test_duplicate_verification_raises_error(self):
        from .services import create_report, add_verification
        from rest_framework.exceptions import ValidationError
        report = create_report(self.user, {
            "location": self.location,
            "title": "Broken ramp",
            "description": "Blocked.",
        })
        verifier = User.objects.create_user(email="svcv@example.com", password="pass1234!")
        add_verification(report, verifier, "confirm")
        with self.assertRaises(ValidationError):
            add_verification(report, verifier, "confirm")
