from django.urls import path, include
from rest_framework.routers import DefaultRouter

from farms.views import (
    FarmViewSet,
    WeatherSnapshotViewSet,
    RiskAssessmentViewSet,
    AIInsightViewSet,
)

router = DefaultRouter()
router.register("farms", FarmViewSet, basename="farms")
router.register("weather-snapshots", WeatherSnapshotViewSet, basename="weather-snapshots")
router.register("risk-assessments", RiskAssessmentViewSet, basename="risk-assessments")
router.register("ai-insights", AIInsightViewSet, basename="ai-insights")

urlpatterns = [
    path("", include(router.urls)),
]