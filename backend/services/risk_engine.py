from typing import List, Dict, Any
from services.crop_conditions import get_crop_conditions, compare_value_to_range

from .crop_conditions import get_crop_conditions, compare_value_to_range


class FarmRiskEngine:
    @staticmethod
    def classify(score):
        if score >= 70:
            return "HIGH"
        if score >= 40:
            return "MEDIUM"
        return "LOW"

    @staticmethod
    def summarize_weather(open_meteo_data) -> Dict[str, Any]:
        current = open_meteo_data.get("current", {})
        daily = open_meteo_data.get("daily", {})

        temps_max = daily.get("temperature_2m_max", []) or []
        temps_min = daily.get("temperature_2m_min", []) or []
        rain_sum = daily.get("rain_sum", []) or daily.get("precipitation_sum", []) or []
        wind_max = daily.get("wind_speed_10m_max", []) or []

        return {
            "current_temperature": current.get("temperature_2m"),
            "current_humidity": current.get("relative_humidity_2m"),
            "current_rain": current.get("rain") or current.get("precipitation"),
            "current_wind_speed": current.get("wind_speed_10m"),
            "max_temperature": max(temps_max) if temps_max else None,
            "min_temperature": min(temps_min) if temps_min else None,
            "avg_max_temperature": round(sum(temps_max) / len(temps_max), 2) if temps_max else None,
            "avg_min_temperature": round(sum(temps_min) / len(temps_min), 2) if temps_min else None,
            "max_rainfall": max(rain_sum) if rain_sum else None,
            "total_rainfall": round(sum(rain_sum), 2) if rain_sum else 0,
            "max_wind_speed": max(wind_max) if wind_max else None,
        }

    @classmethod
    def compute(cls, farm, weather_data):
        summary = cls.summarize_weather(weather_data)

        crop_conditions = get_crop_conditions(farm.crop_type)

        if crop_conditions:
            return cls.compute_crop_aware_risk(
                farm=farm,
                summary=summary,
                crop_conditions=crop_conditions,
            )

        return cls.compute_generic_risk(
            farm=farm,
            summary=summary,
        )

    @classmethod
    def compute_crop_aware_risk(cls, farm, summary, crop_conditions) -> Dict[str, Any]:
        score = 0
        drivers = []
        actions = []
        crop_fit = []

        conditions = crop_conditions["favourable_conditions"]
        interpretation = crop_conditions.get("risk_interpretation", {})

        temperature_rules = conditions.get("temperature_c", {})
        humidity_rules = conditions.get("humidity_percent", {})
        wind_rules = conditions.get("wind_risk", {})

        max_temperature = summary["max_temperature"]
        min_temperature = summary["min_temperature"]
        avg_max_temperature = summary["avg_max_temperature"]
        current_humidity = summary["current_humidity"]
        max_rainfall = summary["max_rainfall"] or 0
        total_rainfall = summary["total_rainfall"] or 0
        max_wind_speed = summary["max_wind_speed"] or 0

        # Temperature suitability
        temp_check = compare_value_to_range(
            value=avg_max_temperature or max_temperature,
            optimal_min=temperature_rules.get("optimal_min"),
            optimal_max=temperature_rules.get("optimal_max"),
            stress_below=temperature_rules.get("stress_below"),
            stress_above=temperature_rules.get("stress_above"),
        )

        score += temp_check["severity"]

        crop_fit.append({
            "factor": "temperature",
            "status": temp_check["status"],
            "observed_value": avg_max_temperature or max_temperature,
            "expected_range": {
                "optimal_min": temperature_rules.get("optimal_min"),
                "optimal_max": temperature_rules.get("optimal_max"),
                "stress_below": temperature_rules.get("stress_below"),
                "stress_above": temperature_rules.get("stress_above"),
            },
            "message": temp_check["message"],
        })

        if temp_check["status"] in ["above_optimal", "too_high_stress"]:
            drivers.append(
                f"Forecast temperatures are high for {crop_conditions['display_name']}."
            )
            actions.append(
                interpretation.get(
                    "too_hot",
                    "High temperatures may stress the crop. Monitor crop condition and avoid midday field operations.",
                )
            )

        if temp_check["status"] in ["below_optimal", "too_low_stress"]:
            drivers.append(
                f"Forecast temperatures are low for {crop_conditions['display_name']}."
            )
            actions.append(
                interpretation.get(
                    "too_cold",
                    "Low temperatures may slow crop growth.",
                )
            )

        # Humidity suitability
        humidity_check = compare_value_to_range(
            value=current_humidity,
            optimal_min=humidity_rules.get("optimal_min"),
            optimal_max=humidity_rules.get("optimal_max"),
        )

        score += min(humidity_check["severity"], 10)

        crop_fit.append({
            "factor": "humidity",
            "status": humidity_check["status"],
            "observed_value": current_humidity,
            "expected_range": {
                "optimal_min": humidity_rules.get("optimal_min"),
                "optimal_max": humidity_rules.get("optimal_max"),
            },
            "message": humidity_check["message"],
        })

        if humidity_check["status"] == "below_optimal":
            drivers.append(
                f"Humidity is below the favourable range for {crop_conditions['display_name']}."
            )
            actions.append(
                "Monitor moisture stress and consider mulching or irrigation where practical."
            )

        if humidity_check["status"] == "above_optimal":
            drivers.append(
                f"Humidity is above the favourable range for {crop_conditions['display_name']}."
            )
            actions.append(
                "Monitor disease pressure, especially fungal and bacterial infections."
            )

        # Rainfall interpretation using daily forecast window
        waterlogging_tolerance = conditions.get("waterlogging_tolerance", "medium")
        drought_tolerance = conditions.get("drought_tolerance", "medium")

        if max_rainfall >= 30:
            if waterlogging_tolerance in ["very_low", "low"]:
                rain_score = 30
            elif waterlogging_tolerance == "medium":
                rain_score = 18
            else:
                rain_score = 8

            score += rain_score

            drivers.append(
                f"Heavy rainfall is expected, and {crop_conditions['display_name']} has {waterlogging_tolerance} waterlogging tolerance."
            )

            actions.append(
                interpretation.get(
                    "too_wet",
                    "Check drainage and avoid fertilizer or pesticide application before heavy rain.",
                )
            )

            crop_fit.append({
                "factor": "rainfall",
                "status": "heavy_rainfall_risk",
                "observed_value": max_rainfall,
                "message": f"Maximum daily rainfall is {max_rainfall} mm during the forecast window.",
            })

        elif total_rainfall <= 5 and max_temperature and max_temperature >= 30:
            if drought_tolerance in ["very_low", "low"]:
                drought_score = 30
            elif drought_tolerance == "medium":
                drought_score = 18
            else:
                drought_score = 8

            score += drought_score

            drivers.append(
                f"Hot and dry conditions are expected, and {crop_conditions['display_name']} has {drought_tolerance} drought tolerance."
            )

            actions.append(
                interpretation.get(
                    "too_dry",
                    "Consider irrigation scheduling and soil moisture conservation.",
                )
            )

            crop_fit.append({
                "factor": "rainfall",
                "status": "dryness_risk",
                "observed_value": total_rainfall,
                "message": f"Total forecast rainfall is only {total_rainfall} mm while temperatures are high.",
            })

        else:
            crop_fit.append({
                "factor": "rainfall",
                "status": "acceptable_short_term",
                "observed_value": total_rainfall,
                "message": "Rainfall does not indicate a major short-term wet or dry risk.",
            })

        # Wind suitability
        sensitive_above = wind_rules.get("sensitive_above_kmh")

        if sensitive_above and max_wind_speed >= sensitive_above:
            score += 20

            drivers.append(
                f"Wind speed may be risky for {crop_conditions['display_name']}."
            )

            actions.append(
                wind_rules.get(
                    "notes",
                    "Strong winds may damage the crop or increase water loss.",
                )
            )

            crop_fit.append({
                "factor": "wind",
                "status": "above_crop_wind_tolerance",
                "observed_value": max_wind_speed,
                "expected_threshold": sensitive_above,
                "message": f"Maximum wind speed of {max_wind_speed} km/h exceeds the crop sensitivity threshold of {sensitive_above} km/h.",
            })
        else:
            crop_fit.append({
                "factor": "wind",
                "status": "acceptable",
                "observed_value": max_wind_speed,
                "expected_threshold": sensitive_above,
                "message": "Wind does not exceed the crop-specific sensitivity threshold.",
            })

        score = min(round(score, 2), 100)
        level = cls.classify(score)

        if not drivers:
            drivers.append(
                f"Forecast conditions are broadly favourable for {crop_conditions['display_name']}."
            )

        if not actions:
            actions.append(
                "Continue normal crop monitoring and routine field planning."
            )

        return {
            "score": score,
            "level": level,
            "drivers": drivers,
            "recommended_actions": actions,
            "weather_summary": summary,
            "crop_conditions": crop_conditions,
            "crop_fit": crop_fit,
        }

    @classmethod
    def compute_generic_risk(cls, farm, summary) -> Dict[str, Any]:
        score = 0
        drivers: List[str] = []
        actions: List[str] = []

        max_rainfall: int | float = summary["max_rainfall"] or 0
        total_rainfall: int | float = summary["total_rainfall"] or 0
        max_wind_speed: int | float = summary["max_wind_speed"] or 0
        max_temperature: int | float = summary["max_temperature"] or 0
        current_humidity: int | float = summary["current_humidity"] or 0

        if max_rainfall >= 30:
            score += 30
            drivers.append("Very heavy rainfall is expected within the forecast window.")
            actions.append("Check drainage and avoid fertilizer or pesticide application before heavy rain.")
        elif max_rainfall >= 15:
            score += 18
            drivers.append("Moderate to heavy rainfall is expected.")
            actions.append("Monitor waterlogging risk and schedule field activity around rain periods.")

        if total_rainfall <= 5 and max_temperature >= 30:
            score += 25
            drivers.append("Hot and dry conditions may increase crop water stress.")
            actions.append("Consider irrigation scheduling and soil moisture conservation.")

        if max_wind_speed >= 40:
            score += 25
            drivers.append("Strong winds are expected.")
            actions.append("Secure young crops, tree seedlings, shade nets, and temporary structures.")
        elif max_wind_speed >= 25:
            score += 12
            drivers.append("Moderate wind risk detected.")
            actions.append("Inspect vulnerable crops and light structures.")

        if max_temperature >= 34:
            score += 15
            drivers.append("High temperatures may cause crop heat stress.")
            actions.append("Avoid midday spraying and monitor crop stress signs.")

        if current_humidity and current_humidity < 35 and max_temperature >= 30:
            score += 10
            drivers.append("Low humidity combined with heat may increase evapotranspiration.")
            actions.append("Prioritize mulching and water retention practices.")

        score = min(score, 100)
        level = cls.classify(score)

        if not drivers:
            drivers.append("No major weather-related threat detected in the forecast period.")

        if not actions:
            actions.append("Continue normal farm monitoring and routine field planning.")

        return {
            "score": round(score, 2),
            "level": level,
            "drivers": drivers,
            "recommended_actions": actions,
            "weather_summary": summary,
            "crop_conditions": None,
            "crop_fit": [],
        }