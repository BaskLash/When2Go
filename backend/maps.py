"""
Google Routes API – Compute Routes client.
Uses directions/v2:computeRoutes with TRAFFIC_AWARE routing.
"""
import logging
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

COMPUTE_ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes"


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
    now_utc = datetime.now(tz=timezone.utc)
    departure_dt = datetime.fromtimestamp(departure_timestamp, tz=timezone.utc)

    # TRAFFIC_AWARE requires a strictly future departureTime.
    # Clamp any slot at-or-before now to 60 s from now so the request is valid.
    if departure_dt <= now_utc:
        departure_dt = now_utc + timedelta(seconds=60)

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
        if not resp.is_success:
            logger.error(
                "Google Routes API %s for departure %s: %s",
                resp.status_code,
                departure_rfc3339,
                resp.text,
            )
            return None
        data = resp.json()

    try:
        route = data["routes"][0]
        # duration is returned as a string like "1800s"
        duration_str = route.get("duration", "")
        if not duration_str:
            return None
        return int(duration_str.rstrip("s"))
    except (KeyError, IndexError, TypeError, ValueError):
        logger.error("Unexpected Routes API response shape: %s", data)
        return None
