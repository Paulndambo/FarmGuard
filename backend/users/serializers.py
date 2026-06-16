from typing import Dict, Any
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from users.models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        validators=[validate_password],
    )
    password_confirm = serializers.CharField(
        write_only=True,
        min_length=8,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "email",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs: Dict[str, Any]):
        password = attrs.get("password")
        password_confirm = attrs.pop("password_confirm", None)

        if password != password_confirm:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )

        email = attrs.get("email")
        username = attrs.get("username")

        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                {"email": "A user with this email already exists."}
            )

        if username and User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError(
                {"username": "A user with this username already exists."}
            )
        return attrs

    def create(self, validated_data: Dict[str, Any]):
        password = validated_data.pop("password")

        user = User.objects.create_user(
            password=password,
            **validated_data,
        )

        return user


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "role",
            "status",
            "tier",
            "phone_number",
            "gender",
            "date_of_birth",
            "city",
            "country",
            "date_joined",
        ]

    def get_full_name(self, obj):
        return obj.get_full_name()