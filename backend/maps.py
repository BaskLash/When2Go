"""
Google Maps Distance Matrix API client.
Only car (driving) mode is supported.
"""
import httpx
from typing import Optional

DISTANCE_MATRIX_URL = "https://maps.googleapis.com/maps/api/distancematrix/json"


async def get_duration_in_traffic(
    origin: str,
    destination: str,
    departure_timestamp: int,
    api_key: str,
) -> Optional[int]:
    """
    Returns travel duration in seconds for the given departure Unix timestamp,
    or None if the API call fails / returns no result.
    """
    params = {
        "origins": origin,
        "destinations": destination,
        "mode": "driving",
        "departure_time": departure_timestamp,
        "traffic_model": "best_guess",
        "key": api_key,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(DISTANCE_MATRIX_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    try:
        element = data["rows"][0]["elements"][0]
        status = element.get("status")
        if status != "OK":
            return None
        # duration_in_traffic is preferred; fall back to duration
        duration = element.get("duration_in_traffic") or element.get("duration")
        return duration["value"]  # seconds
    except (KeyError, IndexError, TypeError):
        return None
