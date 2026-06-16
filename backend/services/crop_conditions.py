from typing import Dict, Any
from services.growth_conditions import CROP_GROWTH_CONDITIONS

def normalize_crop_name(crop_name: str) -> str:
    if not crop_name:
        return "other"

    return crop_name.lower().strip().replace(" ", "_").replace("-", "_")


def get_crop_conditions(crop_name: str):
    normalized = normalize_crop_name(crop_name)

    for item in CROP_GROWTH_CONDITIONS:
        if item["crop"] == normalized:
            return item

    return None


def compare_value_to_range(value, optimal_min=None, optimal_max=None, stress_below=None, stress_above=None) -> Dict[str, Any]:
    """
    Returns a simple interpretation of a weather value compared to
    crop-specific favourable and stress thresholds.
    """

    if value is None:
        return {
            "status": "unknown",
            "severity": 0,
            "message": "No value available for comparison.",
        }

    try:
        value = float(value)
    except (TypeError, ValueError):
        return {
            "status": "unknown",
            "severity": 0,
            "message": "Invalid value for comparison.",
        }

    if stress_below is not None and value < stress_below:
        return {
            "status": "too_low_stress",
            "severity": 25,
            "message": f"Value {value} is below the crop stress threshold of {stress_below}.",
        }

    if stress_above is not None and value > stress_above:
        return {
            "status": "too_high_stress",
            "severity": 25,
            "message": f"Value {value} is above the crop stress threshold of {stress_above}.",
        }

    if optimal_min is not None and value < optimal_min:
        return {
            "status": "below_optimal",
            "severity": 12,
            "message": f"Value {value} is below the crop's favourable range of {optimal_min}–{optimal_max}.",
        }

    if optimal_max is not None and value > optimal_max:
        return {
            "status": "above_optimal",
            "severity": 12,
            "message": f"Value {value} is above the crop's favourable range of {optimal_min}–{optimal_max}.",
        }

    return {
        "status": "favourable",
        "severity": 0,
        "message": f"Value {value} is within the crop's favourable range.",
    }