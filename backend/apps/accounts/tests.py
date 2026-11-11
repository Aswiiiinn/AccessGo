from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class UserModelTest(TestCase):
    def test_create_user(self):
        user = User.objects.create_user(username="testuser", password="pass1234!")
        self.assertEqual(user.role, User.Role.USER)
        self.assertFalse(user.is_admin_user)

    def test_admin_role(self):
        user = User.objects.create_user(username="admin", password="pass1234!", role=User.Role.ADMIN)
        self.assertTrue(user.is_admin_user)
