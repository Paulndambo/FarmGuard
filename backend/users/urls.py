from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import register_view, LoginView, me_view

urlpatterns = [
    path("auth/register/", register_view, name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", me_view, name="me"),
]