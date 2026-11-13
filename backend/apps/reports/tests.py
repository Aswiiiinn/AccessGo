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


# â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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


# â”€â”€ Report CRUD â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

    def test_authenticated_user_can_create_report(self):
        res = self._create()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["title"], "Broken elevator")
        self.assertEqual(res.data["status"], "pending")
        self.assertIn("images", res.data)
        self.assertIn("verification_count", res.data)
        self.assertIn("confirm_count", res.data)
        self.assertIn("dispute_count", res.data)

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
        created = self._create().data
        pk = created["id"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.patch(
            self._detail(pk),
            {"ai_classification": {"category": "hacked"}},
            format="json",
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Creation records a classification result (or failure); the author's PATCH must not alter it.
        self.assertEqual(res.data["ai_classification"], created["ai_classification"])
        self.assertNotEqual((res.data["ai_classification"] or {}).get("category"), "hacked")

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


# â”€â”€ Image upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        big = SimpleUploadedFile("big.jpg", b"x" * (6 * 1024 * 1024), content_type="image/jpeg")
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


# â”€â”€ Verification (existing) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class ReportVerificationTest(APITestCase):
    def setUp(self):
        self.author   = User.objects.create_user(email="vauthor@example.com",   password="Pass1234!")
        self.verifier = User.objects.create_user(email="vverifier@example.com", password="Pass1234!")
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


# â”€â”€ Verification Business Rules â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class VerificationBusinessRulesTest(APITestCase):
    def setUp(self):
        self.author    = User.objects.create_user(email="br_author@example.com",    password="Pass1234!")
        self.verifier  = User.objects.create_user(email="br_verifier@example.com",  password="Pass1234!")
        self.verifier2 = User.objects.create_user(email="br_verifier2@example.com", password="Pass1234!")
        self.admin     = User.objects.create_user(email="br_admin@example.com",     password="Pass1234!", role="admin")
        self.location  = make_location(name="BR Station", location_type="station")

        self.author_token    = get_token(self.client, "br_author@example.com",    "Pass1234!")
        self.verifier_token  = get_token(self.client, "br_verifier@example.com",  "Pass1234!")
        self.verifier2_token = get_token(self.client, "br_verifier2@example.com", "Pass1234!")
        self.admin_token     = get_token(self.client, "br_admin@example.com",     "Pass1234!")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(reverse("report-list"), {
            "location": self.location.pk,
            "title": "Broken ramp",
            "description": "Ramp is blocked.",
        })
        self.report_id      = res.data["id"]
        self.verify_url     = reverse("report-verify",          args=[self.report_id])
        self.dispute_url    = reverse("report-dispute",         args=[self.report_id])
        self.list_ver_url   = reverse("report-verifications",   args=[self.report_id])
        self.my_ver_url     = reverse("report-my-verification", args=[self.report_id])
        self.set_status_url = reverse("report-set-status",      args=[self.report_id])

    # user can verify another user's report
    def test_user_can_verify_another_users_report(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    # user cannot verify their own report
    def test_user_cannot_verify_own_report(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # user cannot submit duplicate verifications
    def test_duplicate_verification_rejected(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ReportVerification.objects.filter(report_id=self.report_id).count(), 1)

    # VER-02: dispute endpoint creates dispute vote
    def test_dispute_endpoint_creates_dispute_vote(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.post(self.dispute_url, {"comment": "I disagree."})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data["vote"], "dispute")

    # author cannot dispute own report
    def test_author_cannot_dispute_own_report(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.post(self.dispute_url, {})
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    # VER-03: list verifications is public
    def test_list_verifications_is_public(self):
        self.client.credentials()
        res = self.client.get(self.list_ver_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_list_verifications_returns_all_votes(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier2_token}")
        self.client.post(self.dispute_url, {"comment": "Disputed."})
        self.client.credentials()
        res = self.client.get(self.list_ver_url)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(len(res.data), 2)

    # disputes counted separately from confirms
    def test_confirm_and_dispute_counts_are_separate(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier2_token}")
        self.client.post(self.dispute_url, {})
        self.client.credentials()
        res = self.client.get(reverse("report-detail", args=[self.report_id]))
        self.assertEqual(res.data["confirm_count"], 1)
        self.assertEqual(res.data["dispute_count"], 1)
        self.assertEqual(res.data["verification_count"], 2)

    # user can change their existing verification
    def test_user_can_change_existing_verification(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        res = self.client.patch(self.my_ver_url, {"vote": "dispute", "comment": "Changed my mind."})
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["vote"], "dispute")
        self.assertEqual(ReportVerification.objects.filter(report_id=self.report_id).count(), 1)

    def test_change_verification_without_existing_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.patch(self.my_ver_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # VER-04: user can withdraw their verification
    def test_user_can_withdraw_verification(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        res = self.client.delete(self.my_ver_url)
        self.assertEqual(res.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ReportVerification.objects.filter(report_id=self.report_id).count(), 0)

    def test_withdraw_nonexistent_verification_returns_400(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.delete(self.my_ver_url)
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unauthenticated_cannot_withdraw(self):
        self.client.credentials()
        res = self.client.delete(self.my_ver_url)
        self.assertEqual(res.status_code, status.HTTP_401_UNAUTHORIZED)

    # verification count updates correctly after withdraw
    def test_verification_count_updates_after_withdraw(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        self.client.delete(self.my_ver_url)
        self.client.credentials()
        res = self.client.get(reverse("report-detail", args=[self.report_id]))
        self.assertEqual(res.data["verification_count"], 0)

    # rejected reports cannot receive new verifications
    def test_rejected_report_cannot_receive_verification(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        self.client.patch(self.set_status_url, {"status": "rejected"}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.post(self.verify_url, {"vote": "confirm"})
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    # verification cannot directly change report status
    def test_verification_does_not_change_report_status(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        self.client.post(self.verify_url, {"vote": "confirm"})
        self.client.credentials()
        res = self.client.get(reverse("report-detail", args=[self.report_id]))
        self.assertEqual(res.data["status"], "pending")

    # admin has final authority over report status
    def test_admin_can_set_report_status(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        res = self.client.patch(self.set_status_url, {"status": "verified"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data["status"], "verified")

    def test_regular_user_cannot_set_report_status(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.verifier_token}")
        res = self.client.patch(self.set_status_url, {"status": "verified"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_author_cannot_set_report_status(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.author_token}")
        res = self.client.patch(self.set_status_url, {"status": "verified"}, format="json")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


# â”€â”€ Service layer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

# â”€â”€ AI classification (Gemini, mocked) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import json
from unittest.mock import patch

from django.test import override_settings
from .models import ReportClassification


class ReportAIClassificationTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="aicls@example.com", password="Pass1234!")
        self.other = User.objects.create_user(email="aicls_other@example.com", password="Pass1234!")
        self.admin = User.objects.create_user(email="aicls_admin@example.com", password="Pass1234!", role="admin")
        self.location = make_location(name="AI Station", location_type="station")
        self.user_token = get_token(self.client, "aicls@example.com", "Pass1234!")
        self.other_token = get_token(self.client, "aicls_other@example.com", "Pass1234!")
        self.admin_token = get_token(self.client, "aicls_admin@example.com", "Pass1234!")
        self.list_url = reverse("report-list")
        self.allowed_categories = list(getattr(AccessibilityReport, "AI_SUGGESTED_CATEGORIES", [])) or ["elevator", "ramp", "other", "unknown"]

    def _create_report(self, token=None, desc="The elevator at Gdansk main railway station is not working. Wheelchair users cannot access the platform."):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token or self.user_token}")
        return self.client.post(self.list_url, {
            "location": self.location.pk,
            "title": "Broken elevator",
            "description": desc,
            "category": "user-elevator",
            "accessibility_impact": "medium",
        })

    @patch("ai_services.classifier.generate_classification_json")
    def test_successful_classification(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "elevator",
            "severity": "high",
            "keywords": ["elevator", "wheelchair access", "platform access"],
            "summary": "Elevator malfunction restricting wheelchair access to the platform.",
            "confidence": 0.95,
        })
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        report = AccessibilityReport.objects.get(pk=res.data["id"])
        self.assertEqual(report.category, "user-elevator")
        self.assertEqual(report.accessibility_impact, "medium")
        cls = ReportClassification.objects.get(report=report)
        self.assertEqual(cls.classification_status, ReportClassification.Status.COMPLETED)
        self.assertEqual(cls.suggested_category, "elevator")
        self.assertEqual(cls.suggested_severity, "high")
        self.assertEqual(cls.confidence_score, 0.95)
        self.assertIn("elevator", cls.keywords)
        self.assertTrue(cls.summary)
        self.assertEqual(cls.ai_provider, "gemini")

    @patch("ai_services.classifier.generate_classification_json")
    def test_correct_category_and_severity_mapping(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "ramp",
            "severity": "critical",
            "keywords": ["ramp"],
            "summary": "Ramp blocked.",
            "confidence": 0.8,
        })
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.suggested_category, "ramp")
        self.assertEqual(cls.suggested_severity, "critical")
        self.assertIn(cls.suggested_category, self.allowed_categories)

    @patch("ai_services.classifier.generate_classification_json")
    def test_invalid_category_returned_by_ai(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "not-a-real-category",
            "severity": "high",
            "keywords": [],
            "summary": "x",
            "confidence": 0.5,
        })
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)
        self.assertTrue(cls.error_message)

    @patch("ai_services.classifier.generate_classification_json")
    def test_invalid_severity_returned_by_ai(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "elevator",
            "severity": "extreme",
            "keywords": [],
            "summary": "x",
            "confidence": 0.5,
        })
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)

    @patch("ai_services.classifier.generate_classification_json")
    def test_invalid_json_response(self, mock_generate):
        mock_generate.return_value = "this is not json"
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)

    @patch("ai_services.classifier.generate_classification_json")
    def test_gemini_api_timeout(self, mock_generate):
        from ai_services.gemini_client import GeminiUnavailableError
        mock_generate.side_effect = GeminiUnavailableError("timeout")
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)

    @patch("ai_services.classifier.generate_classification_json")
    def test_gemini_api_rate_limit(self, mock_generate):
        from ai_services.gemini_client import GeminiRateLimitError
        mock_generate.side_effect = GeminiRateLimitError("rate limited")
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)

    @patch("ai_services.classifier.generate_classification_json")
    def test_gemini_api_unavailable(self, mock_generate):
        from ai_services.gemini_client import GeminiUnavailableError
        mock_generate.side_effect = GeminiUnavailableError("unavailable")
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", res.data)
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)

    @patch("ai_services.classifier.generate_classification_json")
    def test_report_creation_succeeds_when_ai_classification_fails(self, mock_generate):
        mock_generate.side_effect = RuntimeError("boom")
        res = self._create_report()
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(AccessibilityReport.objects.filter(pk=res.data["id"]).exists())
        cls = ReportClassification.objects.get(report_id=res.data["id"])
        self.assertEqual(cls.classification_status, ReportClassification.Status.FAILED)

    @patch("ai_services.classifier.generate_classification_json")
    def test_existing_report_apis_continue_working(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "elevator", "severity": "high", "keywords": [], "summary": "s", "confidence": 0.9
        })
        res = self._create_report()
        pk = res.data["id"]
        self.client.credentials()
        detail = self.client.get(reverse("report-detail", args=[pk]))
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        lst = self.client.get(self.list_url)
        self.assertEqual(lst.status_code, status.HTTP_200_OK)
        self.assertIn("results", lst.data)

    @patch("ai_services.classifier.generate_classification_json")
    def test_classification_not_duplicated_on_reprocess(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "elevator", "severity": "high", "keywords": ["k"], "summary": "s", "confidence": 0.9
        })
        res = self._create_report()
        report = AccessibilityReport.objects.get(pk=res.data["id"])
        from .services import classify_report_async
        c1 = classify_report_async(report, force=True)
        c2 = classify_report_async(report, force=True)
        self.assertEqual(ReportClassification.objects.filter(report=report).count(), 1)
        self.assertEqual(c1.pk, c2.pk)

    @patch("ai_services.classifier.generate_classification_json")
    def test_unauthorized_users_cannot_access_protected_classification(self, mock_generate):
        mock_generate.return_value = json.dumps({
            "category": "elevator", "severity": "high", "keywords": [], "summary": "s", "confidence": 0.9
        })
        res = self._create_report()
        pk = res.data["id"]
        url = reverse("report-classification", args=[pk])
        # unauthenticated
        self.client.credentials()
        r1 = self.client.get(url)
        self.assertEqual(r1.status_code, status.HTTP_401_UNAUTHORIZED)
        # other non-admin user
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.other_token}")
        r2 = self.client.get(url)
        self.assertEqual(r2.status_code, status.HTTP_403_FORBIDDEN)
        # author
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.user_token}")
        r3 = self.client.get(url)
        self.assertEqual(r3.status_code, status.HTTP_200_OK)
        # admin
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.admin_token}")
        r4 = self.client.get(url)
        self.assertEqual(r4.status_code, status.HTTP_200_OK)
