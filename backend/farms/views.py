from datetime import timedelta

from django.utils import timezone
from django.http import HttpRequest, HttpResponse

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny


from farms.models import Farm, WeatherSnapshot, RiskAssessment, AIInsight
from farms.serializers import (
    FarmSerializer,
    FarmDashboardSerializer,
    WeatherSnapshotSerializer,
    RiskAssessmentSerializer,
    AIInsightSerializer,
)
from services.open_meteo import OpenMeteoClient, OpenMeteoError
from services.gemini import GeminiInsightClient, GeminiError
from services.risk_engine import FarmRiskEngine


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request: HttpRequest):
    return Response(
        {
            "status": "ok",
            "service": "FarmGuard AI Backend",
            "time": timezone.now(),
        }
    )


def upstream_error_response(error, provider):
    return Response(
        {
            "error": str(error),
            "provider": provider,
            "status_code": getattr(error, "status_code", None),
            "details": getattr(error, "payload", {}),
        },
        status=status.HTTP_502_BAD_GATEWAY,
    )


class FarmViewSet(viewsets.ModelViewSet):
    queryset = Farm.objects.all().order_by("-created_at")
    serializer_class = FarmSerializer

    def get_serializer_class(self):
        if self.action == "list":
            return FarmDashboardSerializer
        return FarmSerializer
    
    
    def get_queryset(self):
        return Farm.objects.filter(owner=self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=["get"])
    def dashboard(self, request: HttpRequest):
        farms = Farm.objects.filter(owner=request.user)

        return Response(
            {
                "summary": {
                    "total_farms": farms.count(),
                    "high_risk_farms": farms.filter(latest_risk_level="HIGH").count(),
                    "medium_risk_farms": farms.filter(latest_risk_level="MEDIUM").count(),
                    "low_risk_farms": farms.filter(latest_risk_level="LOW").count(),
                    "unknown_risk_farms": farms.filter(latest_risk_level="UNKNOWN").count(),
                },
                "farms": FarmDashboardSerializer(farms, many=True).data,
            }
        )

    @action(detail=True, methods=["get"])
    def weather(self, request: HttpRequest, pk=None):
        farm = self.get_object()

        force_refresh = request.query_params.get("refresh", "false").lower() == "true"
        cache_window = timezone.now() - timedelta(minutes=30)

        if not force_refresh:
            existing_snapshot = (
                farm.weather_snapshots
                .filter(created_at__gte=cache_window)
                .order_by("-created_at")
                .first()
            )

            if existing_snapshot:
                return Response(
                    {
                        "cached": True,
                        "snapshot": WeatherSnapshotSerializer(existing_snapshot).data,
                    }
                )

        try:
            client = OpenMeteoClient()
            data = client.get_forecast(
                lat=farm.lat_float(),
                lon=farm.lon_float(),
                forecast_days=7,
            )

            summary = FarmRiskEngine.summarize_weather(data)

            snapshot = WeatherSnapshot.objects.create(
                farm=farm,
                raw_response=data,
                current_temperature=summary["current_temperature"],
                max_temperature=summary["max_temperature"],
                min_temperature=summary["min_temperature"],
                max_rainfall=summary["max_rainfall"],
                max_wind_speed=summary["max_wind_speed"],
            )

            return Response(
                {
                    "cached": False,
                    "snapshot": WeatherSnapshotSerializer(snapshot).data,
                }
            )

        except OpenMeteoError as error:
            return upstream_error_response(error, "open_meteo")

    @action(detail=True, methods=["post"])
    def risk(self, request: HttpRequest, pk=None):
        farm = self.get_object()

        snapshot = farm.weather_snapshots.order_by("-created_at").first()

        if not snapshot:
            return Response(
                {
                    "error": "No weather snapshot found. Call GET /api/farms/{id}/weather/ first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        risk_result = FarmRiskEngine.compute(
            farm=farm,
            weather_data=snapshot.raw_response,
        )

        assessment = RiskAssessment.objects.create(
            farm=farm,
            weather_snapshot=snapshot,
            score=risk_result["score"],
            level=risk_result["level"],
            drivers=risk_result["drivers"],
            recommended_actions=risk_result["recommended_actions"],
        )

        farm.latest_risk_score = assessment.score
        farm.latest_risk_level = assessment.level
        farm.save(update_fields=["latest_risk_score", "latest_risk_level", "updated_at"])

        return Response(
            {
                "assessment": RiskAssessmentSerializer(assessment).data,
                "weather_summary": risk_result["weather_summary"],
                "crop_conditions": risk_result["crop_conditions"],
                "crop_fit": risk_result["crop_fit"],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["post"], url_path="generate-insight")
    def generate_insight(self, request: HttpRequest, pk=None):
        farm = self.get_object()

        assessment = farm.risk_assessments.order_by("-created_at").first()

        if not assessment:
            return Response(
                {
                    "error": "No risk assessment found. Call POST /api/farms/{id}/risk/ first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        snapshot = assessment.weather_snapshot

        if not snapshot:
            return Response(
                {
                    "error": "Risk assessment has no weather snapshot attached."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        risk_result = {
            "score": assessment.score,
            "level": assessment.level,
            "drivers": assessment.drivers,
            "recommended_actions": assessment.recommended_actions,
        }

        weather_summary = FarmRiskEngine.summarize_weather(snapshot.raw_response)

        try:
            client = GeminiInsightClient()
            result = client.generate_farm_insight(
                farm=farm,
                weather_summary=weather_summary,
                risk_result=risk_result,
            )

            insight = AIInsight.objects.create(
                farm=farm,
                risk_assessment=assessment,
                model=client.model,
                prompt=result["prompt"],
                response=result["response"],
            )

            return Response(
                AIInsightSerializer(insight).data,
                status=status.HTTP_201_CREATED,
            )

        except GeminiError as error:
            return upstream_error_response(error, "gemini")

    @action(detail=True, methods=["get"], url_path="alert-preview")
    def alert_preview(self, request: HttpRequest, pk=None):
        farm = self.get_object()

        assessment = farm.risk_assessments.order_by("-created_at").first()

        if not assessment:
            return Response(
                {
                    "error": "No risk assessment found. Call POST /api/farms/{id}/risk/ first."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        latest_insight = farm.ai_insights.order_by("-created_at").first()

        message = (
            f"FarmGuard Alert: {farm.name} in {farm.county} is currently "
            f"{assessment.level} risk. Score: {assessment.score}. "
            f"Action: {assessment.recommended_actions[0] if assessment.recommended_actions else 'Monitor farm conditions.'}"
        )

        return Response(
            {
                "mode": "simulation",
                "to": farm.owner.phone_number or "No phone number provided",
                "message": message,
                "ai_insight_available": latest_insight is not None,
                "latest_ai_insight": latest_insight.response if latest_insight else None,
            }
        )


class WeatherSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = WeatherSnapshot.objects.select_related("farm").all()
    serializer_class = WeatherSnapshotSerializer


class RiskAssessmentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RiskAssessment.objects.select_related("farm").all()
    serializer_class = RiskAssessmentSerializer


class AIInsightViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AIInsight.objects.select_related("farm", "risk_assessment").all()
    serializer_class = AIInsightSerializer
