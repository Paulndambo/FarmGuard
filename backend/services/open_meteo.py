import requests
from decouple import config


class OpenMeteoError(Exception):
    def __init__(self, message, status_code=None, payload=None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload or {}


class OpenMeteoClient:
    def __init__(self):
        self.base_url = config("OPEN_METEO_BASE_URL").rstrip("/")

    def _handle_response(self, response):
        try:
            payload = response.json()
        except ValueError:
            payload = {"detail": response.text}

        if 200 <= response.status_code < 300:
            return payload

        raise OpenMeteoError(
            message="Open-Meteo API request failed.",
            status_code=response.status_code,
            payload=payload,
        )

    def get_forecast(self, lat, lon, forecast_days=7):
        url = f"{self.base_url}/forecast"

        params = {
            "latitude": lat,
            "longitude": lon,
            "current": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "precipitation",
                    "rain",
                    "wind_speed_10m",
                ]
            ),
            "hourly": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "precipitation_probability",
                    "precipitation",
                    "rain",
                    "wind_speed_10m",
                ]
            ),
            "daily": ",".join(
                [
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                    "rain_sum",
                    "wind_speed_10m_max",
                ]
            ),
            "forecast_days": forecast_days,
            "timezone": "Africa/Nairobi",
        }

        response = requests.get(url, params=params, timeout=30)
        return self._handle_response(response)