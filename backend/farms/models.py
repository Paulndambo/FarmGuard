from decimal import Decimal
from django.db import models
from core.models import BaseModel
from core.constants import CropTypes

# Create your models here.
class Farm(BaseModel):
    owner = models.ForeignKey("users.User", on_delete=models.CASCADE, related_name="farms")
    name = models.CharField(max_length=150)
    county = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    crop_type = models.CharField(max_length=50, choices=CropTypes.choices, default=CropTypes.OTHER)
    land_acres = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("1"))
    notes = models.TextField(blank=True, null=True)
    latest_risk_score = models.FloatField(default=0)
    latest_risk_level = models.CharField(max_length=20, default="UNKNOWN")


    def lat_float(self):
        return float(self.latitude)

    def lon_float(self):
        return float(self.longitude)

    def acres_float(self):
        return float(self.land_acres)

    def __str__(self):
        return f"{self.name} - {self.county}"


class WeatherSnapshot(BaseModel):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="weather_snapshots")
    source = models.CharField(max_length=50, default="open_meteo")
    raw_response = models.JSONField()
    current_temperature = models.FloatField(null=True, blank=True)
    max_temperature = models.FloatField(null=True, blank=True)
    min_temperature = models.FloatField(null=True, blank=True)
    max_rainfall = models.FloatField(null=True, blank=True)
    max_wind_speed = models.FloatField(null=True, blank=True)


class RiskAssessment(BaseModel):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="risk_assessments")
    weather_snapshot = models.ForeignKey(WeatherSnapshot, on_delete=models.SET_NULL, null=True, blank=True)
    score = models.FloatField()
    level = models.CharField(max_length=20)
    drivers = models.JSONField(default=list)
    recommended_actions = models.JSONField(default=list)


class AIInsight(BaseModel):
    farm = models.ForeignKey(Farm, on_delete=models.CASCADE, related_name="ai_insights")
    risk_assessment = models.ForeignKey(RiskAssessment, on_delete=models.CASCADE, related_name="ai_insights")
    model = models.CharField(max_length=100, default="gemini")
    prompt = models.TextField()
    response = models.TextField()