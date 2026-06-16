from typing import List, Dict, Any
CROP_GROWTH_CONDITIONS: List[Dict[str, Any]] = [
    {
        "crop": "maize",
        "display_name": "Maize",
        "category": "cereal",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 18,
                "optimal_max": 27,
                "stress_below": 10,
                "stress_above": 32,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 500,
                "optimal_max": 800,
                "stress_below": 350,
                "stress_above": 1200,
            },
            "soil_ph": {
                "optimal_min": 5.5,
                "optimal_max": 7.0,
            },
            "humidity_percent": {
                "optimal_min": 50,
                "optimal_max": 80,
            },
            "wind_risk": {
                "sensitive_above_kmh": 35,
                "notes": "Strong winds can cause lodging, especially near maturity.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "medium",
        },
        "risk_interpretation": {
            "too_cold": "Low temperatures may slow germination and vegetative growth.",
            "too_hot": "High temperatures may reduce pollination success and grain filling.",
            "too_dry": "Moisture stress can reduce germination, tasseling, and grain formation.",
            "too_wet": "Excess rainfall can cause waterlogging, nutrient leaching, and root stress.",
        },
    },
    {
        "crop": "tea",
        "display_name": "Tea",
        "category": "beverage",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 18,
                "optimal_max": 25,
                "stress_below": 13,
                "stress_above": 30,
            },
            "rainfall_mm_per_year": {
                "optimal_min": 1200,
                "optimal_max": 2500,
                "stress_below": 1000,
                "stress_above": 3000,
            },
            "soil_ph": {
                "optimal_min": 4.5,
                "optimal_max": 5.8,
            },
            "humidity_percent": {
                "optimal_min": 70,
                "optimal_max": 90,
            },
            "wind_risk": {
                "sensitive_above_kmh": 30,
                "notes": "Strong winds can damage young shoots and increase moisture loss.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Cold conditions can slow shoot growth and reduce plucking yield.",
            "too_hot": "Excessive heat may stress tea bushes and reduce leaf quality.",
            "too_dry": "Dry spells reduce flush growth and may require moisture conservation.",
            "too_wet": "Poor drainage under heavy rainfall can damage roots and increase disease risk.",
        },
    },
    {
        "crop": "coffee",
        "display_name": "Coffee",
        "category": "beverage",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 15,
                "optimal_max": 24,
                "stress_below": 10,
                "stress_above": 30,
            },
            "rainfall_mm_per_year": {
                "optimal_min": 1200,
                "optimal_max": 2200,
                "stress_below": 900,
                "stress_above": 2800,
            },
            "soil_ph": {
                "optimal_min": 5.0,
                "optimal_max": 6.5,
            },
            "humidity_percent": {
                "optimal_min": 60,
                "optimal_max": 80,
            },
            "wind_risk": {
                "sensitive_above_kmh": 30,
                "notes": "Coffee is sensitive to strong winds, especially during flowering and fruit development.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Cold weather can slow growth and affect flowering.",
            "too_hot": "High temperatures can reduce bean quality and increase water stress.",
            "too_dry": "Dry conditions can affect flowering, berry development, and bean filling.",
            "too_wet": "Excess rain may increase fungal disease pressure and affect flowering.",
        },
    },
    {
        "crop": "avocado",
        "display_name": "Avocado",
        "category": "fruit",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 16,
                "optimal_max": 28,
                "stress_below": 10,
                "stress_above": 33,
            },
            "rainfall_mm_per_year": {
                "optimal_min": 1000,
                "optimal_max": 1800,
                "stress_below": 700,
                "stress_above": 2500,
            },
            "soil_ph": {
                "optimal_min": 5.5,
                "optimal_max": 7.0,
            },
            "humidity_percent": {
                "optimal_min": 50,
                "optimal_max": 75,
            },
            "wind_risk": {
                "sensitive_above_kmh": 30,
                "notes": "Wind can scar fruits, break branches, and increase flower/fruit drop.",
            },
            "waterlogging_tolerance": "very_low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Low temperatures can affect flowering and young fruit development.",
            "too_hot": "Heat stress may cause flower drop, fruit drop, and sunburn.",
            "too_dry": "Water stress can reduce fruit size and increase fruit drop.",
            "too_wet": "Avocado roots are highly sensitive to waterlogging and root rot.",
        },
    },
    {
        "crop": "rice",
        "display_name": "Rice",
        "category": "cereal",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 20,
                "optimal_max": 35,
                "stress_below": 16,
                "stress_above": 38,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 800,
                "optimal_max": 1500,
                "stress_below": 500,
                "stress_above": 2500,
            },
            "soil_ph": {
                "optimal_min": 5.5,
                "optimal_max": 7.0,
            },
            "humidity_percent": {
                "optimal_min": 60,
                "optimal_max": 90,
            },
            "wind_risk": {
                "sensitive_above_kmh": 40,
                "notes": "Strong winds can cause lodging, especially near maturity.",
            },
            "waterlogging_tolerance": "high",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Cool conditions can slow growth and delay maturity.",
            "too_hot": "Very high temperatures can affect flowering and grain filling.",
            "too_dry": "Water shortage is a major risk, especially for lowland rice.",
            "too_wet": "Rice tolerates wet conditions, but floods or stagnant water can still damage crops depending on variety and stage.",
        },
    },
    {
        "crop": "beans",
        "display_name": "Beans",
        "category": "legume",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 18,
                "optimal_max": 27,
                "stress_below": 12,
                "stress_above": 30,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 300,
                "optimal_max": 600,
                "stress_below": 250,
                "stress_above": 900,
            },
            "soil_ph": {
                "optimal_min": 6.0,
                "optimal_max": 7.5,
            },
            "humidity_percent": {
                "optimal_min": 50,
                "optimal_max": 75,
            },
            "wind_risk": {
                "sensitive_above_kmh": 30,
                "notes": "Strong wind and heavy rain can damage flowers and pods.",
            },
            "waterlogging_tolerance": "very_low",
            "drought_tolerance": "medium",
        },
        "risk_interpretation": {
            "too_cold": "Cold weather slows germination and early growth.",
            "too_hot": "Heat can reduce flowering, pod set, and seed filling.",
            "too_dry": "Moisture stress during flowering and pod filling reduces yield.",
            "too_wet": "Beans are very sensitive to waterlogging and root diseases.",
        },
    },
    {
        "crop": "potato",
        "display_name": "Potato",
        "category": "tuber",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 15,
                "optimal_max": 22,
                "stress_below": 7,
                "stress_above": 28,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 500,
                "optimal_max": 700,
                "stress_below": 350,
                "stress_above": 1000,
            },
            "soil_ph": {
                "optimal_min": 5.0,
                "optimal_max": 6.5,
            },
            "humidity_percent": {
                "optimal_min": 60,
                "optimal_max": 85,
            },
            "wind_risk": {
                "sensitive_above_kmh": 35,
                "notes": "Strong winds increase evapotranspiration and may damage foliage.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Cold conditions can slow emergence and growth.",
            "too_hot": "High temperatures reduce tuber formation and quality.",
            "too_dry": "Moisture stress reduces tuber size and yield.",
            "too_wet": "Wet conditions increase late blight and tuber rot risk.",
        },
    },
    {
        "crop": "tomato",
        "display_name": "Tomato",
        "category": "vegetable",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 18,
                "optimal_max": 27,
                "stress_below": 12,
                "stress_above": 32,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 400,
                "optimal_max": 700,
                "stress_below": 300,
                "stress_above": 1000,
            },
            "soil_ph": {
                "optimal_min": 6.0,
                "optimal_max": 7.0,
            },
            "humidity_percent": {
                "optimal_min": 50,
                "optimal_max": 70,
            },
            "wind_risk": {
                "sensitive_above_kmh": 30,
                "notes": "Wind can damage stems and flowers, especially where plants are not staked.",
            },
            "waterlogging_tolerance": "very_low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Low temperatures reduce flowering, fruit set, and growth.",
            "too_hot": "High temperatures can cause flower drop and poor fruit set.",
            "too_dry": "Irregular moisture can cause blossom-end rot and fruit cracking.",
            "too_wet": "Excess moisture increases fungal and bacterial disease pressure.",
        },
    },
    {
        "crop": "cabbage",
        "display_name": "Cabbage",
        "category": "vegetable",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 15,
                "optimal_max": 24,
                "stress_below": 5,
                "stress_above": 30,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 350,
                "optimal_max": 600,
                "stress_below": 250,
                "stress_above": 900,
            },
            "soil_ph": {
                "optimal_min": 6.0,
                "optimal_max": 7.5,
            },
            "humidity_percent": {
                "optimal_min": 60,
                "optimal_max": 80,
            },
            "wind_risk": {
                "sensitive_above_kmh": 35,
                "notes": "Strong wind can damage leaves and increase moisture loss.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Cold conditions may slow growth and delay maturity.",
            "too_hot": "Heat stress can reduce head formation and quality.",
            "too_dry": "Water stress affects head size and uniformity.",
            "too_wet": "Wet conditions increase disease pressure and root problems.",
        },
    },
    {
        "crop": "onion",
        "display_name": "Onion",
        "category": "vegetable",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 13,
                "optimal_max": 25,
                "stress_below": 7,
                "stress_above": 32,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 350,
                "optimal_max": 550,
                "stress_below": 250,
                "stress_above": 800,
            },
            "soil_ph": {
                "optimal_min": 6.0,
                "optimal_max": 7.0,
            },
            "humidity_percent": {
                "optimal_min": 50,
                "optimal_max": 70,
            },
            "wind_risk": {
                "sensitive_above_kmh": 35,
                "notes": "Dry winds can increase crop water demand.",
            },
            "waterlogging_tolerance": "very_low",
            "drought_tolerance": "medium",
        },
        "risk_interpretation": {
            "too_cold": "Cold conditions slow establishment and bulb development.",
            "too_hot": "Excess heat can reduce bulb size and quality.",
            "too_dry": "Moisture stress affects bulb formation.",
            "too_wet": "Onions are sensitive to waterlogging and bulb rot.",
        },
    },
    {
        "crop": "banana",
        "display_name": "Banana",
        "category": "fruit",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 24,
                "optimal_max": 30,
                "stress_below": 14,
                "stress_above": 35,
            },
            "rainfall_mm_per_year": {
                "optimal_min": 1200,
                "optimal_max": 2500,
                "stress_below": 1000,
                "stress_above": 3000,
            },
            "soil_ph": {
                "optimal_min": 5.5,
                "optimal_max": 7.0,
            },
            "humidity_percent": {
                "optimal_min": 70,
                "optimal_max": 90,
            },
            "wind_risk": {
                "sensitive_above_kmh": 30,
                "notes": "Bananas are highly vulnerable to wind damage because of large leaves and shallow roots.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "low",
        },
        "risk_interpretation": {
            "too_cold": "Cold conditions slow leaf emergence and bunch development.",
            "too_hot": "High heat can increase water demand and reduce plant vigor.",
            "too_dry": "Bananas require consistent moisture and are sensitive to drought.",
            "too_wet": "Poor drainage can cause root stress and disease.",
        },
    },
    {
        "crop": "sugarcane",
        "display_name": "Sugarcane",
        "category": "industrial",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 20,
                "optimal_max": 32,
                "stress_below": 15,
                "stress_above": 38,
            },
            "rainfall_mm_per_year": {
                "optimal_min": 1000,
                "optimal_max": 1800,
                "stress_below": 800,
                "stress_above": 2500,
            },
            "soil_ph": {
                "optimal_min": 5.5,
                "optimal_max": 7.5,
            },
            "humidity_percent": {
                "optimal_min": 60,
                "optimal_max": 85,
            },
            "wind_risk": {
                "sensitive_above_kmh": 45,
                "notes": "Strong winds can lodge cane and complicate harvesting.",
            },
            "waterlogging_tolerance": "medium",
            "drought_tolerance": "medium",
        },
        "risk_interpretation": {
            "too_cold": "Cool temperatures slow cane growth and sugar accumulation.",
            "too_hot": "Extreme heat increases crop water demand.",
            "too_dry": "Dry conditions reduce cane growth and yield.",
            "too_wet": "Excess water can affect root health and field operations.",
        },
    },
    {
        "crop": "wheat",
        "display_name": "Wheat",
        "category": "cereal",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 12,
                "optimal_max": 25,
                "stress_below": 4,
                "stress_above": 32,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 350,
                "optimal_max": 650,
                "stress_below": 250,
                "stress_above": 900,
            },
            "soil_ph": {
                "optimal_min": 6.0,
                "optimal_max": 7.5,
            },
            "humidity_percent": {
                "optimal_min": 45,
                "optimal_max": 70,
            },
            "wind_risk": {
                "sensitive_above_kmh": 40,
                "notes": "Strong winds can cause lodging and grain loss near maturity.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "medium",
        },
        "risk_interpretation": {
            "too_cold": "Cold conditions can slow emergence and tillering.",
            "too_hot": "Heat stress during flowering and grain filling reduces yield.",
            "too_dry": "Water stress affects tillering and grain filling.",
            "too_wet": "Excessive rainfall can increase disease pressure and lodging.",
        },
    },
    {
        "crop": "sorghum",
        "display_name": "Sorghum",
        "category": "cereal",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 25,
                "optimal_max": 32,
                "stress_below": 15,
                "stress_above": 38,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 350,
                "optimal_max": 700,
                "stress_below": 250,
                "stress_above": 1000,
            },
            "soil_ph": {
                "optimal_min": 5.5,
                "optimal_max": 7.5,
            },
            "humidity_percent": {
                "optimal_min": 40,
                "optimal_max": 70,
            },
            "wind_risk": {
                "sensitive_above_kmh": 40,
                "notes": "Strong winds can cause lodging, especially in tall varieties.",
            },
            "waterlogging_tolerance": "low",
            "drought_tolerance": "high",
        },
        "risk_interpretation": {
            "too_cold": "Low temperatures slow germination and early growth.",
            "too_hot": "Extreme heat may affect flowering and grain filling.",
            "too_dry": "Sorghum tolerates dry conditions better than maize, but severe drought still reduces yield.",
            "too_wet": "Waterlogging can damage roots and reduce stand establishment.",
        },
    },
    {
        "crop": "green_grams",
        "display_name": "Green Grams",
        "category": "legume",
        "favourable_conditions": {
            "temperature_c": {
                "optimal_min": 25,
                "optimal_max": 35,
                "stress_below": 15,
                "stress_above": 40,
            },
            "rainfall_mm_per_season": {
                "optimal_min": 300,
                "optimal_max": 600,
                "stress_below": 200,
                "stress_above": 800,
            },
            "soil_ph": {
                "optimal_min": 6.0,
                "optimal_max": 7.5,
            },
            "humidity_percent": {
                "optimal_min": 40,
                "optimal_max": 70,
            },
            "wind_risk": {
                "sensitive_above_kmh": 35,
                "notes": "Strong wind and heavy rainfall can damage flowers and pods.",
            },
            "waterlogging_tolerance": "very_low",
            "drought_tolerance": "high",
        },
        "risk_interpretation": {
            "too_cold": "Cool weather slows germination and growth.",
            "too_hot": "Extreme heat can reduce flowering and pod set.",
            "too_dry": "The crop tolerates moderate drought but needs moisture during flowering.",
            "too_wet": "Excess rainfall can cause fungal disease and poor pod quality.",
        },
    },
]