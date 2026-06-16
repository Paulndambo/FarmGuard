from django.db import models

from django.contrib.auth.models import AbstractUser
from core.models import BaseModel
from core.constants import UserRole, UserStatus, UserTier

# Create your models here.
class User(AbstractUser, BaseModel):
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.CUSTOMER)
    tier = models.CharField(max_length=50, choices=UserTier.choices, default=UserTier.FREE)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    gender = models.CharField(max_length=10, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)
    city = models.CharField(max_length=100, null=True, blank=True)
    country = models.CharField(max_length=100, null=True, blank=True, default="Kenya")
    status = models.CharField(max_length=30, choices=UserStatus.choices, default=UserStatus.ACTIVE)
    activation_token = models.UUIDField(blank=True, null=True)
    password_reset_token = models.UUIDField(blank=True, null=True)
    password_reset_token_expiry = models.DateTimeField(null=True)
    
    def __str__(self):
        return self.get_full_name() or self.username