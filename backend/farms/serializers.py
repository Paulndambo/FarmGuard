from rest_framework import serializers
from farms.models import Farm, WeatherSnapshot, RiskAssessment, AIInsight


class FarmSerializer(serializers.ModelSerializer):
    owner = serializers.ReadOnlyField(source="owner.username")

    class Meta:
        model = Farm
        fields = [
            "id",
            "owner",
            "name",
            "county",
            "latitude",
            "longitude",
            "crop_type",
            "land_acres",
            "notes",
            "latest_risk_score",
            "latest_risk_level",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "owner",
            "latest_risk_score",
            "latest_risk_level",
            "created_at",
            "updated_at",
        ]


class FarmDashboardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farm
        fields = [
            "id",
            "name",
            "county",
            "crop_type",
            "land_acres",
            "latest_risk_score",
            "latest_risk_level",
            "updated_at",
        ]


class WeatherSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = WeatherSnapshot
        fields = [
            "id",
            "farm",
            "source",
            "raw_response",
            "current_temperature",
            "max_temperature",
            "min_temperature",
            "max_rainfall",
            "max_wind_speed",
            "created_at",
        ]


class RiskAssessmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RiskAssessment
        fields = [
            "id",
            "farm",
            "weather_snapshot",
            "score",
            "level",
            "drivers",
            "recommended_actions",
            "created_at",
        ]


class AIInsightSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIInsight
        fields = [
            "id",
            "farm",
            "risk_assessment",
            "model",
            "prompt",
            "response",
            "created_at",
        ]