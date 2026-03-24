"""
Google Routes API – Compute Route Matrix client.

Replaces the old Distance Matrix API because:
- Distance Matrix only returns duration_in_traffic for near-current departures.
  Future slots silently fall back to a static, traffic-free duration value,
  making every time slot look identical.
- Routes API with TRAFFIC_AWARE applies predicted traffic for any future
  departureTime, including rush-hour windows hours from now.
"""
import httpx
from datetime import datetime, timezone
from typing import Optional

ROUTE_MATRIX_URL = (
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
)


async def get_duration_in_traffic(
    origin: str,
    destination: str,
    departure_timestamp: int,
    api_key: str,
) -> Optional[int]:
    """
    Returns traffic-aware travel duration in seconds for the given departure
    Unix timestamp using the Routes API Compute Route Matrix.
    Returns None if the call fails or no route exists.
    """
    # Routes API requires RFC 3339 UTC — convert from Unix timestamp
    departure_dt = datetime.fromtimestamp(departure_timestamp, tz=timezone.utc)
    departure_rfc3339 = departure_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "origins": [{"waypoint": {"address": origin}}],
        "destinations": [{"waypoint": {"address": destination}}],
        "travelMode": "DRIVE",
        # TRAFFIC_AWARE: uses live + predicted traffic for the given departure time.
        # More cost-efficient than TRAFFIC_AWARE_OPTIMAL while still varying
        # correctly by time-of-day and day-of-week.
        "routingPreference": "TRAFFIC_AWARE",
        "departureTime": departure_rfc3339,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,status,condition",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(ROUTE_MATRIX_URL, json=payload, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    try:
        # Response is a JSON array of route matrix elements
        element = data[0]
        if element.get("condition") == "ROUTE_NOT_FOUND":
            return None
        # duration is a Duration string, e.g. "1800s"
        duration_str = element.get("duration", "")
        if not duration_str:
            return None
        return int(duration_str.rstrip("s"))
    except (IndexError, KeyError, TypeError, ValueError):
        return None
