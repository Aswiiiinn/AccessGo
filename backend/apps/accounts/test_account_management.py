"""Security tests for user account management: logout, profile, password change and recovery.

No real email is sent: Django's test runner swaps in the locmem email backend.
"""
import re
from datetime import timedelta
from unittest import mock

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator, default_token_generator
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()

LOGIN_URL = reverse("token_obtain_pair")
REFRESH_URL = reverse("token_refresh")
LOGOUT_URL = reverse("token_blacklist")
PROFILE_URL = reverse("profile")
CHANGE_PASSWORD_URL = reverse("change-password")
CHANGE_EMAIL_URL = reverse("change-email")
FORGOT_PASSWORD_URL = reverse("forgot-password")
RESET_VALIDATE_URL = reverse("reset-password-validate")
RESET_CONFIRM_URL = reverse("reset-password-confirm")

PASSWORD = "StrongPass1!"
NEW_PASSWORD = "Newer-Secret-42"


class AccountTestMixin:
    def setUp(self):
        cache.clear()  # throttle counters live in the cache
        self.user = User.objects.create_user(email="owner@example.com", password=PASSWORD, full_name="Owner")
        self.other = User.objects.create_user(email="other@example.com", password=PASSWORD, full_name="Other")

    def login(self, email="owner@example.com", password=PASSWORD):
        return self.client.post(LOGIN_URL, {"email": email, "password": password})

    def authenticate(self):
        tokens = self.login().data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")
        return tokens

    def reset_params(self, user=None):
        user = user or self.user
        return {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }


class LogoutTest(AccountTestMixin, APITestCase):
    def test_logout_blacklists_refresh_token(self):
        tokens = self.authenticate()
        response = self.client.post(LOGOUT_URL, {"refresh": tokens["refresh"]})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        refresh = self.client.post(REFRESH_URL, {"refresh": tokens["refresh"]})
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_with_invalid_token_fails(self):
        response = self.client.post(LOGOUT_URL, {"refresh": "garbage"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_rotates_and_blacklists_old_token(self):
        tokens = self.login().data
        first = self.client.post(REFRESH_URL, {"refresh": tokens["refresh"]})
        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertIn("refresh", first.data)
        reused = self.client.post(REFRESH_URL, {"refresh": tokens["refresh"]})
        self.assertEqual(reused.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_access_token_is_rejected(self):
        token = AccessToken.for_user(self.user)
        token.set_exp(lifetime=-timedelta(seconds=1))
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        self.assertEqual(self.client.get(PROFILE_URL).status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileSecurityTest(AccountTestMixin, APITestCase):
    def test_profile_never_exposes_password(self):
        self.authenticate()
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("password", response.data)
        self.assertNotIn("pbkdf2", response.content.decode())

    def test_cannot_escalate_role_superuser_or_staff(self):
        self.authenticate()
        response = self.client.patch(
            PROFILE_URL, {"role": "admin", "is_superuser": True, "is_staff": True}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.role, "user")
        self.assertFalse(self.user.is_superuser)
        self.assertFalse(self.user.is_staff)

    def test_update_only_affects_own_profile(self):
        self.authenticate()
        response = self.client.patch(PROFILE_URL, {"id": self.other.pk, "full_name": "Changed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.user.pk)
        self.other.refresh_from_db()
        self.assertEqual(self.other.full_name, "Other")

    def test_duplicate_username_rejected(self):
        self.authenticate()
        response = self.client.patch(PROFILE_URL, {"username": self.other.username}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", response.data["detail"])

    def test_non_image_avatar_rejected(self):
        self.authenticate()
        not_image = SimpleUploadedFile("x.png", b"not an image", content_type="image/png")
        response = self.client.patch(PROFILE_URL, {"avatar": not_image}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("avatar", response.data["detail"])

    def test_change_email_requires_correct_password(self):
        self.authenticate()
        bad = self.client.post(CHANGE_EMAIL_URL, {"new_email": "new@example.com", "password": "wrong"})
        self.assertEqual(bad.status_code, status.HTTP_400_BAD_REQUEST)
        ok = self.client.post(CHANGE_EMAIL_URL, {"new_email": "New@Example.com", "password": PASSWORD})
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, "new@example.com")

    def test_change_email_rejects_invalid_and_taken_email(self):
        self.authenticate()
        invalid = self.client.post(CHANGE_EMAIL_URL, {"new_email": "not-an-email", "password": PASSWORD})
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_email", invalid.data["detail"])
        taken = self.client.post(CHANGE_EMAIL_URL, {"new_email": "OTHER@example.com", "password": PASSWORD})
        self.assertEqual(taken.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_email", taken.data["detail"])


class ChangePasswordTest(AccountTestMixin, APITestCase):
    def payload(self, **overrides):
        data = {"old_password": PASSWORD, "new_password": NEW_PASSWORD, "re_new_password": NEW_PASSWORD}
        data.update(overrides)
        return data

    def test_requires_authentication(self):
        response = self.client.post(CHANGE_PASSWORD_URL, self.payload())
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_success_changes_password_and_revokes_refresh_tokens(self):
        tokens = self.authenticate()
        response = self.client.post(CHANGE_PASSWORD_URL, self.payload())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["reauthentication_required"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))
        refresh = self.client.post(REFRESH_URL, {"refresh": tokens["refresh"]})
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials()
        self.assertEqual(self.login(password=PASSWORD).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, status.HTTP_200_OK)

    def test_wrong_current_password(self):
        self.authenticate()
        response = self.client.post(CHANGE_PASSWORD_URL, self.payload(old_password="nope"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("old_password", response.data["detail"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_confirmation_mismatch(self):
        self.authenticate()
        response = self.client.post(CHANGE_PASSWORD_URL, self.payload(re_new_password="Different-42x"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("re_new_password", response.data["detail"])

    def test_weak_passwords_rejected_by_django_validators(self):
        self.authenticate()
        for weak in ("short", "12345678901", "password123"):
            response = self.client.post(CHANGE_PASSWORD_URL, self.payload(new_password=weak, re_new_password=weak))
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, weak)
            self.assertIn("new_password", response.data["detail"])

    def test_password_similar_to_email_rejected(self):
        self.authenticate()
        similar = "owner@example.com"
        response = self.client.post(CHANGE_PASSWORD_URL, self.payload(new_password=similar, re_new_password=similar))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class ForgotPasswordTest(AccountTestMixin, APITestCase):
    def test_registered_email_sends_reset_link(self):
        response = self.client.post(FORGOT_PASSWORD_URL, {"email": "OWNER@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["owner@example.com"])
        self.assertIn("/reset-password?uid=", mail.outbox[0].body)

    def test_unregistered_email_gives_identical_response(self):
        registered = self.client.post(FORGOT_PASSWORD_URL, {"email": "owner@example.com"})
        unknown = self.client.post(FORGOT_PASSWORD_URL, {"email": "nobody@example.com"})
        self.assertEqual(unknown.status_code, status.HTTP_200_OK)
        self.assertEqual(unknown.data, registered.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_inactive_user_gets_no_email(self):
        self.user.is_active = False
        self.user.save()
        response = self.client.post(FORGOT_PASSWORD_URL, {"email": "owner@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_mail_failure_does_not_leak_account_existence(self):
        with mock.patch("apps.accounts.views.send_mail", side_effect=OSError("smtp down")), \
                self.assertLogs("apps.accounts.views", level="ERROR"):
            response = self.client.post(FORGOT_PASSWORD_URL, {"email": "owner@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_invalid_email_format(self):
        response = self.client.post(FORGOT_PASSWORD_URL, {"email": "not-an-email"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rate_limited(self):
        with mock.patch.object(ScopedRateThrottle, "THROTTLE_RATES", {"password_reset": "2/hour"}):
            codes = [
                self.client.post(FORGOT_PASSWORD_URL, {"email": "x@example.com"}).status_code
                for _ in range(3)
            ]
        self.assertEqual(codes, [200, 200, 429])


class ResetPasswordTest(AccountTestMixin, APITestCase):
    def confirm(self, params, password=NEW_PASSWORD, confirm=None):
        return self.client.post(RESET_CONFIRM_URL, {
            **params, "new_password": password, "re_new_password": confirm or password,
        })

    def test_link_from_email_round_trip(self):
        self.client.post(FORGOT_PASSWORD_URL, {"email": "owner@example.com"})
        match = re.search(r"uid=([^&\s]+)&token=([^&\s]+)", mail.outbox[0].body)
        params = {"uid": match.group(1), "token": match.group(2)}
        self.assertEqual(self.client.post(RESET_VALIDATE_URL, params).status_code, status.HTTP_200_OK)
        self.assertEqual(self.confirm(params).status_code, status.HTTP_200_OK)
        self.assertEqual(self.login(password=NEW_PASSWORD).status_code, status.HTTP_200_OK)

    def test_valid_token_validates(self):
        response = self.client.post(RESET_VALIDATE_URL, self.reset_params())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {"valid": True})

    def test_invalid_token(self):
        params = {"uid": self.reset_params()["uid"], "token": "abc-123"}
        self.assertEqual(self.client.post(RESET_VALIDATE_URL, params).status_code, status.HTTP_400_BAD_REQUEST)
        response = self.confirm(params)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("token", response.data["detail"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_invalid_uid(self):
        for uid in ("@@@", urlsafe_base64_encode(force_bytes(999999)), urlsafe_base64_encode(b"abc")):
            response = self.client.post(RESET_VALIDATE_URL, {"uid": uid, "token": "x"})
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, uid)

    def test_token_for_one_user_does_not_work_for_another(self):
        params = self.reset_params()
        params["uid"] = urlsafe_base64_encode(force_bytes(self.other.pk))
        self.assertEqual(self.confirm(params).status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_token(self):
        params = self.reset_params()
        later = default_token_generator._now() + timedelta(hours=2)  # PASSWORD_RESET_TIMEOUT = 1h
        with mock.patch.object(PasswordResetTokenGenerator, "_now", return_value=later):
            self.assertEqual(self.client.post(RESET_VALIDATE_URL, params).status_code, status.HTTP_400_BAD_REQUEST)
            self.assertEqual(self.confirm(params).status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PASSWORD))

    def test_token_cannot_be_reused(self):
        params = self.reset_params()
        self.assertEqual(self.confirm(params).status_code, status.HTTP_200_OK)
        again = self.confirm(params, password="Another-Pass-77")
        self.assertEqual(again.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(NEW_PASSWORD))

    def test_reset_revokes_existing_sessions(self):
        tokens = self.login().data
        self.assertEqual(self.confirm(self.reset_params()).status_code, status.HTTP_200_OK)
        refresh = self.client.post(REFRESH_URL, {"refresh": tokens["refresh"]})
        self.assertEqual(refresh.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_validation_and_mismatch_do_not_burn_token(self):
        params = self.reset_params()
        weak = self.confirm(params, password="123")
        self.assertEqual(weak.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("new_password", weak.data["detail"])
        mismatch = self.confirm(params, password=NEW_PASSWORD, confirm="Something-else-9")
        self.assertEqual(mismatch.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("re_new_password", mismatch.data["detail"])
        self.assertEqual(self.confirm(params).status_code, status.HTTP_200_OK)
