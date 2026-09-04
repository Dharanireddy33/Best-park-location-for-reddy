import csv
from pathlib import Path

from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/location", tags=["location"])

DATASET_PATH = Path(__file__).resolve().parents[3] / "dataset" / "parks.csv"
with DATASET_PATH.open(encoding="utf-8-sig", newline="") as dataset_file:
    DATASET = {row["Area"].strip().lower(): row for row in csv.DictReader(dataset_file)}

LOCATIONS = {
    "chennai": {
        "name": "Chennai",
        "latitude": 13.0827,
        "longitude": 80.2707,
        "population": 120000,
        "area_km2": 8.5,
        "available_land_km2": 3.5,
        "accessibility_km": 1.5,
        "existing_parks": [
            {"name": "Central Park", "distance_km": 2.4, "area_km2": 0.7},
            {"name": "Riverside Gardens", "distance_km": 5.1, "area_km2": 1.2},
        ],
        "pollution": {
            "aqi": 142,
            "pm25": 72,
            "pm10": 118,
            "no2": 45,
            "co": 0.8,
            "o3": 21,
        },
    },
    "anna nagar": {
        "name": "Anna Nagar",
        "latitude": 13.0824,
        "longitude": 80.2060,
        "population": 85000,
        "area_km2": 6.2,
        "available_land_km2": 1.1,
        "accessibility_km": 2.2,
        "existing_parks": [
            {"name": "Anna Nagar Park", "distance_km": 1.2, "area_km2": 0.5},
            {"name": "Lake View Gardens", "distance_km": 3.5, "area_km2": 0.8},
        ],
        "pollution": {
            "aqi": 135,
            "pm25": 65,
            "pm10": 110,
            "no2": 39,
            "co": 0.7,
            "o3": 19,
        },
    },
}


def find_location(query: str):
    normalized_query = query.strip().lower()
    for name, row in DATASET.items():
        if name in normalized_query or normalized_query in name:
            base_info = LOCATIONS.get(name, {})
            existing_parks = base_info.get("existing_parks", [])
            return {
                **base_info,
                "name": row["Area"],
                "latitude": float(row["Latitude"]),
                "longitude": float(row["Longitude"]),
                "population": int(row["Population"]),
                "area_km2": float(row["CityArea_km2"]),
                "available_land_km2": float(row["OpenLand"]),
                "accessibility_km": float(row["RoadAccess"]),
                "existing_parks": existing_parks or [
                    {"name": "Existing parks", "distance_km": 0, "area_km2": 0}
                ] * int(row["ExistingParks"]),
                "pollution": {
                    **base_info.get("pollution", {}),
                    "aqi": float(row["AQI"]),
                },
                "dataset": row,
            }
    for name, info in LOCATIONS.items():
        if name in normalized_query or normalized_query in name:
            return info
    return None


@router.get("")
def list_locations():
    return {
        "locations": [
            {"name": info["name"], "latitude": info["latitude"], "longitude": info["longitude"]}
            for info in LOCATIONS.values()
        ]
    }


@router.get("/search")
def search_location(query: str):
    result = find_location(query)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")
    return result


def calculate_demand_score(
    population_density: float,
    pollution_aqi: float,
    existing_parks: int,
    available_land: float,
    accessibility: float,
) -> int:
    score = 0

    if population_density > 10000:
        score += 25
    elif population_density > 5000:
        score += 15
    else:
        score += 5

    if pollution_aqi > 150:
        score += 25
    elif pollution_aqi > 100:
        score += 15
    else:
        score += 5

    if existing_parks == 0:
        score += 20
    elif existing_parks <= 2:
        score += 10

    if available_land >= 5:
        score += 20
    elif available_land >= 1:
        score += 10

    if accessibility < 2:
        score += 10

    return min(score, 100)


@router.get("/population")
def population_analysis(location: str):
    result = find_location(location)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    population = result["population"]
    area_km2 = result["area_km2"]
    population_density = int(population / area_km2)

    return {
        "population": population,
        "area_km2": area_km2,
        "population_density": population_density,
    }


@router.get("/pollution")
def pollution_analysis(location: str):
    result = find_location(location)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    return result["pollution"]


@router.get("/existing-parks")
def existing_park_analysis(location: str):
    result = find_location(location)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    parks = result["existing_parks"]
    nearest = min(parks, key=lambda park: park["distance_km"])

    return {
        "population": result["population"],
        "existing_parks": len(parks),
        "nearest_park": nearest["name"],
        "nearest_distance_km": nearest["distance_km"],
        "nearest_park_area_km2": nearest["area_km2"],
    }


@router.get("/demand")
def demand_analysis(location: str):
    result = find_location(location)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    population_density = result["population"] / result["area_km2"]
    pollution_aqi = result["pollution"]["aqi"]
    existing_park_count = len(result["existing_parks"])
    available_land = result["available_land_km2"]
    accessibility = result["accessibility_km"]

    score = calculate_demand_score(
        population_density,
        pollution_aqi,
        existing_park_count,
        available_land,
        accessibility,
    )

    return {
        "demand_score": score,
        "population_density": int(population_density),
        "pollution_aqi": pollution_aqi,
        "existing_park_count": existing_park_count,
        "available_land_km2": available_land,
        "accessibility_km": accessibility,
    }


@router.get("/analysis")
def location_analysis(location: str):
    result = find_location(location)
    if not result:
        raise HTTPException(status_code=404, detail="Location not found")

    dataset = result.get("dataset")
    population_density = float(dataset["PopulationDensity"]) if dataset else int(result["population"] / result["area_km2"])
    pollution_aqi = result["pollution"]["aqi"]
    existing_park_count = int(dataset["ExistingParks"]) if dataset else len(result["existing_parks"])
    available_land = result["available_land_km2"]
    accessibility = result["accessibility_km"]
    calculated_demand_score = calculate_demand_score(
        population_density,
        pollution_aqi,
        existing_park_count,
        available_land,
        accessibility,
    )
    demand_score = float(dataset["ParkDemandScore"]) if dataset else calculated_demand_score

    nearest = min(result["existing_parks"], key=lambda park: park["distance_km"]) if result["existing_parks"] else {
        "name": "No park data",
        "distance_km": 0,
        "area_km2": 0,
    }

    recommendation = "SMALL PARK"
    recommended_area = "1–3 hectares"

    if demand_score >= 80:
        recommendation = "LARGE PARK"
        recommended_area = "6–8 hectares"
    elif demand_score >= 60:
        recommendation = "MEDIUM PARK"
        recommended_area = "3–5 hectares"

    return {
        "name": result["name"],
        "latitude": result["latitude"],
        "longitude": result["longitude"],
        "population": result["population"],
        "area_km2": result["area_km2"],
        "population_density": population_density,
        "pollution": result["pollution"],
        "existing_parks": {
            "count": existing_park_count,
            "nearest_park": nearest["name"],
            "nearest_distance_km": nearest["distance_km"],
            "nearest_park_area_km2": nearest["area_km2"],
            "list": result["existing_parks"],
        },
        "available_land_km2": available_land,
        "accessibility_km": accessibility,
        "demand_score": demand_score,
        "recommendation": recommendation,
        "recommended_area": recommended_area,
        "dataset_details": {
            key: (float(value) if key != "Area" else value)
            for key, value in dataset.items()
        } if dataset else None,
    }
