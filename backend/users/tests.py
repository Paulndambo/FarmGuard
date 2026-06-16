from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from users.models import User
from users.serializers import RegisterSerializer, UserSerializer
from users.views import get_tokens_for_user


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class UserModelAndSerializerTests(TestCase):
    def test_user_string_prefers_full_name_then_username(self):
        named_user = User.objects.create_user(
            username="mary",
            first_name="Mary",
            last_name="Wanjiku",
            password="StrongPass123!",
        )
        unnamed_user = User.objects.create_user(username="plain", password="StrongPass123!")

        self.assertEqual(str(named_user), "Mary Wanjiku")
        self.assertEqual(str(unnamed_user), "plain")

    def test_register_serializer_creates_hashed_password_and_removes_confirmation(self):
        serializer = RegisterSerializer(
            data={
                "first_name": "Asha",
                "last_name": "Otieno",
                "username": "asha",
                "email": "asha@example.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        user = serializer.save()

        self.assertTrue(user.check_password("StrongPass123!"))
        self.assertFalse(hasattr(user, "password_confirm"))

    def test_register_serializer_rejects_mismatched_duplicate_email_and_username(self):
        User.objects.create_user(
            username="existing",
            email="farmer@example.com",
            password="StrongPass123!",
        )

        mismatch = RegisterSerializer(
            data={
                "username": "new-user",
                "email": "new@example.com",
                "password": "StrongPass123!",
                "password_confirm": "OtherPass123!",
            }
        )
        self.assertFalse(mismatch.is_valid())
        self.assertIn("password_confirm", mismatch.errors)

        duplicate_email = RegisterSerializer(
            data={
                "username": "other",
                "email": "FARMER@example.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            }
        )
        self.assertFalse(duplicate_email.is_valid())
        self.assertIn("email", duplicate_email.errors)

        duplicate_username = RegisterSerializer(
            data={
                "username": "Existing",
                "email": "other@example.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            }
        )
        self.assertFalse(duplicate_username.is_valid())
        self.assertIn("username", duplicate_username.errors)

    def test_user_serializer_includes_full_name(self):
        user = User.objects.create_user(
            username="serialized",
            first_name="Serialized",
            last_name="Farmer",
            password="StrongPass123!",
        )

        self.assertEqual(UserSerializer(user).data["full_name"], "Serialized Farmer")


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class AuthApiTests(APITestCase):
    def test_register_returns_user_and_jwt_tokens(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "first_name": "Nia",
                "last_name": "Kimani",
                "username": "nia",
                "email": "nia@example.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["message"], "User registered successfully.")
        self.assertEqual(response.data["user"]["username"], "nia")
        self.assertIn("access", response.data["tokens"])
        self.assertIn("refresh", response.data["tokens"])

    def test_register_returns_validation_errors(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "username": "bad",
                "email": "bad@example.com",
                "password": "StrongPass123!",
                "password_confirm": "DifferentPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)

    def test_login_me_and_token_refresh_flow(self):
        user = User.objects.create_user(
            username="login-user",
            email="login@example.com",
            first_name="Login",
            password="StrongPass123!",
        )

        login = self.client.post(
            "/api/auth/login/",
            {"username": "login-user", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)
        self.assertIn("refresh", login.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        me = self.client.get("/api/me/")
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertEqual(me.data["user"]["id"], str(user.id))
        self.assertEqual(me.data["user"]["full_name"], "Login")

        refresh = self.client.post(
            "/api/auth/token/refresh/",
            {"refresh": login.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh.data)

    def test_me_requires_authentication(self):
        response = self.client.get("/api/me/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_tokens_for_user_returns_refresh_and_access(self):
        user = User.objects.create_user(username="token-user", password="StrongPass123!")

        tokens = get_tokens_for_user(user)

        refresh = RefreshToken(tokens["refresh"])
        access = AccessToken(tokens["access"])
        self.assertEqual(str(refresh["user_id"]), str(user.id))
        self.assertEqual(str(access["user_id"]), str(user.id))
