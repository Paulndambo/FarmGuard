from decimal import Decimal
from unittest.mock import Mock, patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from farms.models import AIInsight, Farm, RiskAssessment, WeatherSnapshot
from farms.serializers import (
    AIInsightSerializer,
    FarmDashboardSerializer,
    FarmSerializer,
    RiskAssessmentSerializer,
    WeatherSnapshotSerializer,
)
from services.gemini import GeminiError, GeminiInsightClient
from services.open_meteo import OpenMeteoClient, OpenMeteoError
from services.risk_engine import FarmRiskEngine
from users.models import User


WEATHER_DATA = {
    "current": {
        "temperature_2m": 31,
        "relative_humidity_2m": 30,
        "rain": 0,
        "wind_speed_10m": 18,
    },
    "daily": {
        "temperature_2m_max": [31, 35, 33],
        "temperature_2m_min": [18, 19, 20],
        "rain_sum": [0, 2, 1],
        "wind_speed_10m_max": [20, 42, 28],
    },
}

LOW_RISK_WEATHER_DATA = {
    "current": {"temperature_2m": 22, "relative_humidity_2m": 70, "precipitation": 0},
    "daily": {
        "temperature_2m_max": [24, 25],
        "temperature_2m_min": [16, 17],
        "precipitation_sum": [3, 2],
        "wind_speed_10m_max": [8, 9],
    },
}


def create_user(username="farmer", **extra):
    defaults = {
        "email": f"{username}@example.com",
        "password": "StrongPass123!",
    }
    defaults.update(extra)
    return User.objects.create_user(username=username, **defaults)


def create_farm(owner, name="Green Acre", **extra):
    defaults = {
        "county": "Nakuru",
        "latitude": Decimal("-0.3030990"),
        "longitude": Decimal("36.0800250"),
        "crop_type": "maize",
        "land_acres": Decimal("2.50"),
    }
    defaults.update(extra)
    return Farm.objects.create(owner=owner, name=name, **defaults)


def create_snapshot(farm, raw_response=None, **extra):
    raw_response = raw_response or WEATHER_DATA
    summary = FarmRiskEngine.summarize_weather(raw_response)
    defaults = {
        "raw_response": raw_response,
        "current_temperature": summary["current_temperature"],
        "max_temperature": summary["max_temperature"],
        "min_temperature": summary["min_temperature"],
        "max_rainfall": summary["max_rainfall"],
        "max_wind_speed": summary["max_wind_speed"],
    }
    defaults.update(extra)
    return WeatherSnapshot.objects.create(farm=farm, **defaults)


def create_assessment(farm, snapshot=None, **extra):
    snapshot = snapshot or create_snapshot(farm)
    defaults = {
        "weather_snapshot": snapshot,
        "score": 85,
        "level": "HIGH",
        "drivers": ["Strong winds are expected."],
        "recommended_actions": ["Secure vulnerable structures."],
    }
    defaults.update(extra)
    return RiskAssessment.objects.create(farm=farm, **defaults)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class FarmModelAndSerializerTests(TestCase):
    def test_farm_numeric_helpers_and_string(self):
        farm = create_farm(create_user())

        self.assertEqual(farm.lat_float(), -0.303099)
        self.assertEqual(farm.lon_float(), 36.080025)
        self.assertEqual(farm.acres_float(), 2.5)
        self.assertEqual(str(farm), "Green Acre - Nakuru")

    def test_farm_serializers_expose_expected_shapes(self):
        farm = create_farm(create_user(username="owner"))
        snapshot = create_snapshot(farm)
        assessment = create_assessment(farm, snapshot=snapshot)
        insight = AIInsight.objects.create(
            farm=farm,
            risk_assessment=assessment,
            prompt="Prompt",
            response="Insight",
        )

        self.assertEqual(FarmSerializer(farm).data["owner"], "owner")
        self.assertIn("latest_risk_level", FarmDashboardSerializer(farm).data)
        self.assertEqual(WeatherSnapshotSerializer(snapshot).data["source"], "open_meteo")
        self.assertEqual(RiskAssessmentSerializer(assessment).data["level"], "HIGH")
        self.assertEqual(AIInsightSerializer(insight).data["response"], "Insight")


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class RiskEngineTests(TestCase):
    def test_classify_boundaries(self):
        self.assertEqual(FarmRiskEngine.classify(70), "HIGH")
        self.assertEqual(FarmRiskEngine.classify(40), "MEDIUM")
        self.assertEqual(FarmRiskEngine.classify(39.99), "LOW")

    def test_summarize_weather_handles_rain_and_precipitation_fallbacks(self):
        summary = FarmRiskEngine.summarize_weather(LOW_RISK_WEATHER_DATA)

        self.assertEqual(summary["current_temperature"], 22)
        self.assertEqual(summary["current_rain"], 0)
        self.assertEqual(summary["max_temperature"], 25)
        self.assertEqual(summary["min_temperature"], 16)
        self.assertEqual(summary["max_rainfall"], 3)
        self.assertEqual(summary["total_rainfall"], 5)
        self.assertEqual(summary["max_wind_speed"], 9)

    def test_compute_high_risk_and_low_risk_defaults(self):
        farm = create_farm(create_user())

        high = FarmRiskEngine.compute(farm, WEATHER_DATA)
        low = FarmRiskEngine.compute(farm, LOW_RISK_WEATHER_DATA)

        self.assertEqual(high["level"], "HIGH")
        self.assertEqual(high["score"], 75)
        self.assertGreaterEqual(len(high["drivers"]), 3)
        self.assertEqual(low["level"], "LOW")
        self.assertEqual(low["drivers"], ["No major weather-related threat detected in the forecast period."])
        self.assertEqual(low["recommended_actions"], ["Continue normal farm monitoring and routine field planning."])


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class ExternalClientTests(TestCase):
    @patch("services.open_meteo.requests.get")
    @patch("services.open_meteo.config", return_value="https://weather.example")
    def test_open_meteo_client_sends_expected_request_and_returns_payload(self, config_mock, get_mock):
        response = Mock(status_code=200)
        response.json.return_value = {"ok": True}
        get_mock.return_value = response

        payload = OpenMeteoClient().get_forecast(-1.2, 36.8, forecast_days=3)

        self.assertEqual(payload, {"ok": True})
        get_mock.assert_called_once()
        _, kwargs = get_mock.call_args
        self.assertEqual(kwargs["params"]["latitude"], -1.2)
        self.assertEqual(kwargs["params"]["longitude"], 36.8)
        self.assertEqual(kwargs["params"]["forecast_days"], 3)
        self.assertEqual(kwargs["timeout"], 30)

    @patch("services.open_meteo.config", return_value="https://weather.example/")
    def test_open_meteo_client_handles_json_and_text_errors(self, config_mock):
        client = OpenMeteoClient()
        json_response = Mock(status_code=503)
        json_response.json.return_value = {"detail": "down"}

        with self.assertRaises(OpenMeteoError) as json_error:
            client._handle_response(json_response)

        self.assertEqual(json_error.exception.status_code, 503)
        self.assertEqual(json_error.exception.payload, {"detail": "down"})

        text_response = Mock(status_code=500, text="plain failure")
        text_response.json.side_effect = ValueError

        with self.assertRaises(OpenMeteoError) as text_error:
            client._handle_response(text_response)

        self.assertEqual(text_error.exception.payload, {"detail": "plain failure"})

    @patch("services.gemini.requests.post")
    @patch("services.gemini.config")
    def test_gemini_client_builds_prompt_extracts_text_and_posts_payload(self, config_mock, post_mock):
        config_mock.side_effect = lambda key, default=None: {
            "GEMINI_API_KEY": "secret",
            "GEMINI_MODEL": "gemini-test",
            "GEMINI_BASE_URL": "https://gemini.example",
        }.get(key, default)
        response = Mock(status_code=200)
        response.json.return_value = {
            "candidates": [{"content": {"parts": [{"text": "Practical advice"}]}}]
        }
        post_mock.return_value = response
        farm = create_farm(create_user())
        risk_result = {"score": 20, "level": "LOW", "drivers": [], "recommended_actions": []}

        result = GeminiInsightClient().generate_farm_insight(farm, {"max_temperature": 25}, risk_result)

        self.assertIn("Farm:", result["prompt"])
        self.assertEqual(result["response"], "Practical advice")
        post_mock.assert_called_once()
        _, kwargs = post_mock.call_args
        self.assertEqual(kwargs["params"], {"key": "secret"})
        self.assertEqual(kwargs["timeout"], 45)

    @patch("services.gemini.config")
    def test_gemini_client_requires_api_key_and_maps_errors(self, config_mock):
        config_mock.side_effect = lambda key, default=None: {
            "GEMINI_API_KEY": "",
            "GEMINI_MODEL": "gemini-test",
            "GEMINI_BASE_URL": "https://gemini.example",
        }.get(key, default)

        with self.assertRaises(GeminiError):
            GeminiInsightClient()

        config_mock.side_effect = lambda key, default=None: {
            "GEMINI_API_KEY": "secret",
            "GEMINI_MODEL": "gemini-test",
            "GEMINI_BASE_URL": "https://gemini.example",
        }.get(key, default)
        client = GeminiInsightClient()
        response = Mock(status_code=429)
        response.json.return_value = {"error": "limited"}

        with self.assertRaises(GeminiError) as error:
            client._handle_response(response)

        self.assertEqual(str(error.exception), "Gemini rate limit exceeded.")
        self.assertEqual(error.exception.status_code, 429)
        self.assertEqual(client._extract_text({}), "Gemini returned a response, but no readable text was found.")


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class FarmApiTests(APITestCase):
    def setUp(self):
        self.user = create_user(username="api-owner", phone_number="+254700000000")
        self.other_user = create_user(username="other-owner")
        self.client.force_authenticate(self.user)

    def test_health_check_is_public(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["service"], "FarmGuard AI Backend")

    def test_farm_crud_is_owner_scoped(self):
        other_farm = create_farm(self.other_user, name="Other Farm")

        created = self.client.post(
            "/api/farms/",
            {
                "name": "Owner Farm",
                "county": "Meru",
                "latitude": "-0.0470350",
                "longitude": "37.6498030",
                "crop_type": "tea",
                "land_acres": "3.75",
                "notes": "Near river",
            },
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        farm_id = created.data["id"]
        farm = Farm.objects.get(id=farm_id)
        self.assertEqual(farm.owner, self.user)

        listing = self.client.get("/api/farms/")
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(listing.data[0]["name"], "Owner Farm")

        detail = self.client.get(f"/api/farms/{farm_id}/")
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["owner"], "api-owner")

        patch = self.client.patch(f"/api/farms/{farm_id}/", {"notes": "Updated"}, format="json")
        self.assertEqual(patch.status_code, status.HTTP_200_OK)
        self.assertEqual(patch.data["notes"], "Updated")

        other_detail = self.client.get(f"/api/farms/{other_farm.id}/")
        self.assertEqual(other_detail.status_code, status.HTTP_404_NOT_FOUND)

        delete = self.client.delete(f"/api/farms/{farm_id}/")
        self.assertEqual(delete.status_code, status.HTTP_204_NO_CONTENT)

    def test_dashboard_counts_risk_levels_for_authenticated_owner(self):
        create_farm(self.user, name="High", latest_risk_level="HIGH")
        create_farm(self.user, name="Medium", latest_risk_level="MEDIUM")
        create_farm(self.user, name="Low", latest_risk_level="LOW")
        create_farm(self.user, name="Unknown", latest_risk_level="UNKNOWN")
        create_farm(self.other_user, name="Other", latest_risk_level="HIGH")

        response = self.client.get("/api/farms/dashboard/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["summary"],
            {
                "total_farms": 4,
                "high_risk_farms": 1,
                "medium_risk_farms": 1,
                "low_risk_farms": 1,
                "unknown_risk_farms": 1,
            },
        )
        self.assertEqual(len(response.data["farms"]), 4)

    def test_weather_returns_recent_cache_without_calling_provider(self):
        farm = create_farm(self.user)
        snapshot = create_snapshot(farm)

        with patch("farms.views.OpenMeteoClient") as client_mock:
            response = self.client.get(f"/api/farms/{farm.id}/weather/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["cached"])
        self.assertEqual(response.data["snapshot"]["id"], str(snapshot.id))
        client_mock.assert_not_called()

    @patch("farms.views.OpenMeteoClient")
    def test_weather_refresh_fetches_provider_and_stores_snapshot(self, client_mock):
        farm = create_farm(self.user)
        client_mock.return_value.get_forecast.return_value = WEATHER_DATA

        response = self.client.get(f"/api/farms/{farm.id}/weather/?refresh=true")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["cached"])
        self.assertEqual(farm.weather_snapshots.count(), 1)
        snapshot = farm.weather_snapshots.get()
        self.assertEqual(snapshot.current_temperature, 31)
        client_mock.return_value.get_forecast.assert_called_once_with(
            lat=farm.lat_float(),
            lon=farm.lon_float(),
            forecast_days=7,
        )

    @patch("farms.views.OpenMeteoClient")
    def test_weather_returns_upstream_error_payload(self, client_mock):
        farm = create_farm(self.user)
        client_mock.return_value.get_forecast.side_effect = OpenMeteoError(
            "provider failed",
            status_code=503,
            payload={"detail": "down"},
        )

        response = self.client.get(f"/api/farms/{farm.id}/weather/?refresh=true")

        self.assertEqual(response.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(response.data["provider"], "open_meteo")
        self.assertEqual(response.data["status_code"], 503)
        self.assertEqual(response.data["details"], {"detail": "down"})

    def test_risk_requires_weather_snapshot_then_creates_assessment_and_updates_farm(self):
        farm = create_farm(self.user)

        missing = self.client.post(f"/api/farms/{farm.id}/risk/")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)

        snapshot = create_snapshot(farm)
        created = self.client.post(f"/api/farms/{farm.id}/risk/")

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(created.data["assessment"]["weather_snapshot"]), str(snapshot.id))
        farm.refresh_from_db()
        self.assertEqual(farm.latest_risk_level, "HIGH")
        self.assertEqual(farm.latest_risk_score, 75)

    @patch("farms.views.GeminiInsightClient")
    def test_generate_insight_requires_assessment_snapshot_and_handles_success_and_errors(self, client_mock):
        farm = create_farm(self.user)

        no_assessment = self.client.post(f"/api/farms/{farm.id}/generate-insight/")
        self.assertEqual(no_assessment.status_code, status.HTTP_400_BAD_REQUEST)

        snapshotless = create_assessment(farm, snapshot=create_snapshot(farm), weather_snapshot=None)
        no_snapshot = self.client.post(f"/api/farms/{farm.id}/generate-insight/")
        self.assertEqual(no_snapshot.status_code, status.HTTP_400_BAD_REQUEST)
        snapshotless.delete()

        assessment = create_assessment(farm)
        client_mock.return_value.model = "gemini-test"
        client_mock.return_value.generate_farm_insight.return_value = {
            "prompt": "Prompt text",
            "response": "Insight text",
        }

        created = self.client.post(f"/api/farms/{farm.id}/generate-insight/")

        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual(str(created.data["risk_assessment"]), str(assessment.id))
        self.assertEqual(created.data["model"], "gemini-test")
        self.assertEqual(created.data["response"], "Insight text")

        client_mock.return_value.generate_farm_insight.side_effect = GeminiError(
            "gemini failed",
            status_code=401,
            payload={"error": "bad key"},
        )
        failed = self.client.post(f"/api/farms/{farm.id}/generate-insight/")
        self.assertEqual(failed.status_code, status.HTTP_502_BAD_GATEWAY)
        self.assertEqual(failed.data["provider"], "gemini")

    def test_alert_preview_requires_assessment_and_includes_latest_insight(self):
        farm = create_farm(self.user)

        missing = self.client.get(f"/api/farms/{farm.id}/alert-preview/")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)

        assessment = create_assessment(farm)
        AIInsight.objects.create(
            farm=farm,
            risk_assessment=assessment,
            prompt="Prompt",
            response="Detailed advice",
        )

        response = self.client.get(f"/api/farms/{farm.id}/alert-preview/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["mode"], "simulation")
        self.assertEqual(response.data["to"], "+254700000000")
        self.assertTrue(response.data["ai_insight_available"])
        self.assertEqual(response.data["latest_ai_insight"], "Detailed advice")
        self.assertIn("FarmGuard Alert: Green Acre", response.data["message"])

    def test_read_only_related_endpoints_are_serialized(self):
        farm = create_farm(self.user)
        snapshot = create_snapshot(farm)
        assessment = create_assessment(farm, snapshot=snapshot)
        insight = AIInsight.objects.create(
            farm=farm,
            risk_assessment=assessment,
            prompt="Prompt",
            response="Insight",
        )

        snapshot_response = self.client.get("/api/weather-snapshots/")
        risk_response = self.client.get("/api/risk-assessments/")
        insight_response = self.client.get("/api/ai-insights/")

        self.assertEqual(snapshot_response.status_code, status.HTTP_200_OK)
        self.assertEqual(snapshot_response.data[0]["id"], str(snapshot.id))
        self.assertEqual(risk_response.status_code, status.HTTP_200_OK)
        self.assertEqual(risk_response.data[0]["id"], str(assessment.id))
        self.assertEqual(insight_response.status_code, status.HTTP_200_OK)
        self.assertEqual(insight_response.data[0]["id"], str(insight.id))

    def test_authentication_is_required_for_farm_endpoints(self):
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/farms/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
