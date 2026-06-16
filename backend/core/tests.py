from decimal import Decimal

from django.test import TestCase, override_settings

from farms.models import Farm
from users.models import User


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class BaseModelTests(TestCase):
    def test_base_model_fields_are_populated_and_ordering_is_newest_first(self):
        user = User.objects.create_user(username="owner", password="StrongPass123!")
        older = Farm.objects.create(
            owner=user,
            name="Older",
            county="Nakuru",
            latitude=Decimal("-0.3030990"),
            longitude=Decimal("36.0800250"),
        )
        newer = Farm.objects.create(
            owner=user,
            name="Newer",
            county="Kiambu",
            latitude=Decimal("-1.1713890"),
            longitude=Decimal("36.8355560"),
        )

        self.assertIsNotNone(older.id)
        self.assertIsNotNone(older.created_at)
        self.assertIsNotNone(older.updated_at)
        self.assertEqual(list(Farm.objects.values_list("name", flat=True)), ["Newer", "Older"])
