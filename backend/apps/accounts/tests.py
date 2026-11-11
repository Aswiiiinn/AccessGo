from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model

User = get_user_model()

REGISTER_URL = reverse("register")
LOGIN_URL = reverse("token_obtain_pair")
REFRESH_URL = reverse("token_refresh")
PROFILE_URL = reverse("profile")


class UserModelTest(APITestCase):
    def test_create_user_defaults_to_user_role(self):
        user = User.objects.create_user(email="test@example.com", password="pass1234!")
        self.assertEqual(user.role, User.Role.USER)
        self.assertFalse(user.is_admin_user)

    def test_admin_role_property(self):
        user = User.objects.create_user(
            email="admin@example.com", password="pass1234!", role=User.Role.ADMIN
        )
        self.assertTrue(user.is_admin_user)

    def test_email_is_username_field(self):
        self.assertEqual(User.USERNAME_FIELD, "email")

    def test_username_defaults_to_email_prefix(self):
        user = User.objects.create_user(email="alice@example.com", password="pass1234!")
        self.assertEqual(user.username, "alice")


class RegistrationTest(APITestCase):
    def test_register_with_email_and_password(self):
        payload = {"email": "newuser@example.com", "password": "StrongPass1!"}
        response = self.client.post(REGISTER_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("email", response.data)
        self.assertNotIn("password", response.data)

    def test_register_with_full_name(self):
        payload = {
            "email": "named@example.com",
            "password": "StrongPass1!",
            "full_name": "Alice Smith",
        }
        response = self.client.post(REGISTER_URL, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["full_name"], "Alice Smith")

    def test_register_duplicate_email_fails(self):
        User.objects.create_user(email="dup@example.com", password="pass1234!")
        response = self.client.post(REGISTER_URL, {"email": "dup@example.com", "password": "pass1234!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_without_email_fails(self):
        response = self.client.post(REGISTER_URL, {"password": "StrongPass1!"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="login@example.com", password="StrongPass1!"
        )

    def test_login_returns_access_and_refresh_tokens(self):
        response = self.client.post(LOGIN_URL, {
            "email": "login@example.com",
            "password": "StrongPass1!",
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_with_wrong_password_fails(self):
        response = self.client.post(LOGIN_URL, {
            "email": "login@example.com",
            "password": "wrongpassword",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_unknown_email_fails(self):
        response = self.client.post(LOGIN_URL, {
            "email": "nobody@example.com",
            "password": "StrongPass1!",
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class TokenRefreshTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="refresh@example.com", password="StrongPass1!"
        )
        login = self.client.post(LOGIN_URL, {
            "email": "refresh@example.com",
            "password": "StrongPass1!",
        })
        self.refresh_token = login.data["refresh"]

    def test_refresh_returns_new_access_token(self):
        response = self.client.post(REFRESH_URL, {"refresh": self.refresh_token})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)

    def test_invalid_refresh_token_fails(self):
        response = self.client.post(REFRESH_URL, {"refresh": "not-a-valid-token"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class ProfileTest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="profile@example.com",
            password="StrongPass1!",
            full_name="Profile User",
        )
        login = self.client.post(LOGIN_URL, {
            "email": "profile@example.com",
            "password": "StrongPass1!",
        })
        self.access_token = login.data["access"]

    def test_unauthenticated_request_returns_401(self):
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_request_returns_profile(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.get(PROFILE_URL)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "profile@example.com")
        self.assertEqual(response.data["full_name"], "Profile User")

    def test_profile_update_full_name_and_bio(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.patch(PROFILE_URL, {"full_name": "Updated Name", "bio": "Hello!"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["full_name"], "Updated Name")
        self.assertEqual(response.data["bio"], "Hello!")

    def test_profile_cannot_change_role(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.patch(PROFILE_URL, {"role": "admin"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], "user")

    def test_profile_cannot_change_email(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.access_token}")
        response = self.client.patch(PROFILE_URL, {"email": "hacked@example.com"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["email"], "profile@example.com")
