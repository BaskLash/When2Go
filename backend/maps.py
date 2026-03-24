"""
Google Routes API – Route Matrix client.
Uses distanceMatrix/v2:computeRouteMatrix with TRAFFIC_AWARE routing.

Architecture note:
  The Google Routes Matrix API accepts a single departureTime per request,
  so we still issue one request per departure slot. The matrix endpoint is
  used here because:
    1. It is the correct API for multi-element distance/duration lookups.
    2. The response format (list of RouteMatrixElement) is well-suited to
       building a {timestamp -> duration} mapping in one place.
    3. When the same route needs to be evaluated against multiple origin
       or destination variants in the future, zero changes are needed here.
  All slot requests are issued concurrently via asyncio.gather in the caller.
"""
import asyncio
import logging
import httpx
from datetime import datetime, timedelta, timezone
from typing import Optional

logger = logging.getLogger(__name__)

COMPUTE_ROUTE_MATRIX_URL = (
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix"
)


async def _fetch_single_slot(
    client: httpx.AsyncClient,
    origin: str,
    destination: str,
    departure_ts: int,
    api_key: str,
) -> tuple[int, Optional[int]]:
    """
    Call computeRouteMatrix for a single departure timestamp.
    Returns (departure_ts, duration_seconds) or (departure_ts, None) on failure.
    """
    now_utc = datetime.now(tz=timezone.utc)
    departure_dt = datetime.fromtimestamp(departure_ts, tz=timezone.utc)

    # TRAFFIC_AWARE requires a strictly future departureTime.
    if departure_dt <= now_utc:
        departure_dt = now_utc + timedelta(seconds=60)

    departure_rfc3339 = departure_dt.strftime("%Y-%m-%dT%H:%M:%SZ")

    payload = {
        "origins": [{"waypoint": {"address": origin}}],
        "destinations": [{"waypoint": {"address": destination}}],
        "travelMode": "DRIVE",
        "routingPreference": "TRAFFIC_AWARE",
        "departureTime": departure_rfc3339,
    }
    headers = {
        "X-Goog-Api-Key": api_key,
        # Request only the fields we actually use – minimises cost per element.
        "X-Goog-FieldMask": (
            "originIndex,destinationIndex,duration,distanceMeters,status"
        ),
        "Content-Type": "application/json",
    }

    resp = await client.post(COMPUTE_ROUTE_MATRIX_URL, json=payload, headers=headers)
    if not resp.is_success:
        logger.error(
            "Routes Matrix API %s for departure %s: %s",
            resp.status_code,
            departure_rfc3339,
            resp.text,
        )
        return departure_ts, None

    elements = resp.json()
    if not elements or not isinstance(elements, list):
        logger.error("Unexpected matrix response shape for %s: %s", departure_rfc3339, elements)
        return departure_ts, None

    elem = elements[0]
    # Check for element-level error (e.g. NOT_FOUND for an unresolvable address)
    if elem.get("status", {}).get("code", 0) != 0:
        logger.error(
            "Matrix element error for departure %s: %s", departure_rfc3339, elem.get("status")
        )
        return departure_ts, None

    duration_str = elem.get("duration", "")
    if not duration_str:
        return departure_ts, None

    try:
        return departure_ts, int(duration_str.rstrip("s"))
    except ValueError:
        logger.error("Could not parse duration %r for departure %s", duration_str, departure_rfc3339)
        return departure_ts, None


async def get_durations_matrix(
    origin: str,
    destination: str,
    departure_timestamps: list[int],
    api_key: str,
) -> dict[int, Optional[int]]:
    """
    Fetch traffic-aware durations for a list of departure Unix timestamps.

    All requests are issued concurrently over a single shared HTTP connection
    pool to minimise latency. Returns a dict mapping each input timestamp to
    its travel duration in seconds (or None if the call failed).
    """
    if not departure_timestamps:
        return {}

    async with httpx.AsyncClient(timeout=10.0) as client:
        tasks = [
            _fetch_single_slot(client, origin, destination, ts, api_key)
            for ts in departure_timestamps
        ]
        pairs = await asyncio.gather(*tasks)

    return dict(pairs)
