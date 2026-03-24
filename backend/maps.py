"""
Google Routes API – Compute Routes client.
Uses directions/v2/computeRoutes with TRAFFIC_AWARE routing.
"""
import httpx
from datetime import datetime, timezone
from typing import Optional

COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2/computeRoutes"


async def get_duration_in_traffic(
    origin: str,
    destination: str,
    departure_timestamp: int,
    api_key: str,
) -> Optional[int]:
    """
    Returns traffic-aware travel duration in seconds for the given departure
    Unix timestamp using the Routes API computeRoutes endpoint.
    Returns None if the call fails or no route is found.
    """
    departure_dt = datetime.fromtimestamp(departure_timestamp, tz=timezone.utc)
    departure_rfc3339 = departure_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "origin": {"address": origin},
        "destination": {"address": destination},
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "departureTime": departure_rfc3339,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(COMPUTE_ROUTES_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    try:
        route = data["routes"][0]
        # duration is returned as a string like "1800s"
        duration_str = route.get("duration", "")
        if not duration_str:
            return None
        return int(duration_str.rstrip("s"))
    except (KeyError, IndexError, TypeError, ValueError):
        return None
