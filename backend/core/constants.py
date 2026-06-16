from django.db import models


class UserRole(models.TextChoices):
    CUSTOMER = "customer", "Customer"
    ADMIN = "admin", "Admin"


class UserTier(models.TextChoices):
    FREE = "free", "Free"
    PREMIUM = "premium", "Premium"


class UserStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    ACTIVE = "active", "Active"
    SUSPENDED = "suspended", "Suspended"
    DEACTIVATED = "deactivated", "Deactivated"


class CropTypes(models.TextChoices):
    MAIZE = "maize", "Maize"
    TEA = "tea", "Tea"
    COFFEE = "coffee", "Coffee"
    AVOCADO = "avocado", "Avocado"
    RICE = "rice", "Rice"
    VEGETABLE = "vegetables", "Vegetables"
    MIXED = "mixed", "Mixed"
    OTHER = "other", "Other"