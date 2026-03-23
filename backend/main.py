"""
When2Go – FastAPI backend
Helps users decide WHEN to leave to minimize travel time.
"""
import asyncio
import os
import time
from datetime import datetime, timedelta, timezone
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import cache as cache_module
import maps

load_dotenv()

GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY", "")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "1200"))  # 20 min default
SIMULATION_INTERVAL_MIN = 10  # minutes between each simulated departure
DEFAULT_WINDOW_HOURS = 2

app = FastAPI(title="When2Go API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class AnalyzeRequest(BaseModel):
    origin: str
    destination: str
    start_time: Optional[str] = None  # ISO-8601 or "HH:MM"
    end_time: Optional[str] = None


class TimelineEntry(BaseModel):
    time: str        # "HH:MM"
    timestamp: int   # Unix
    duration: int    # minutes


class AnalyzeResponse(BaseModel):
    current_duration: Optional[int]    # minutes
    best_duration: int                 # minutes
    best_departure_time: str           # "HH:MM"
    time_saved: int                    # minutes (vs leaving now)
    timeline: list[TimelineEntry]
    window_start: str
    window_end: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_time_input(value: str, reference: datetime) -> datetime:
    """Parse 'HH:MM' or ISO-8601 string into a datetime (local-aware)."""
    value = value.strip()
    if "T" in value or len(value) > 5:
        # Attempt ISO-8601
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            pass
    # Try HH:MM
    h, m = value.split(":")
    return reference.replace(hour=int(h), minute=int(m), second=0, microsecond=0)


def _floor_to_bucket(dt: datetime, bucket_minutes: int = 10) -> int:
    """Return minutes-of-day floored to bucket_minutes."""
    total = dt.hour * 60 + dt.minute
    return (total // bucket_minutes) * bucket_minutes


async def _fetch_with_cache(
    origin: str,
    destination: str,
    departure_dt: datetime,
    api_key: str,
) -> Optional[int]:
    """Fetch travel duration (seconds) using cache where possible."""
    day_of_week = departure_dt.weekday()
    time_bucket = _floor_to_bucket(departure_dt)
    departure_ts = int(departure_dt.timestamp())

    cached = cache_module.get(origin, destination, day_of_week, time_bucket)
    if cached is not None:
        return cached

    if not api_key:
        # Demo mode: return a plausible random-ish duration for testing UI
        import random
        base = 40 * 60  # 40 min base
        noise = random.randint(-10, 10) * 60
        hour = departure_dt.hour
        # Simulate rush-hour pattern
        if 7 <= hour < 9 or 17 <= hour < 19:
            noise += random.randint(10, 20) * 60
        value = max(10 * 60, base + noise)
        cache_module.set(origin, destination, day_of_week, time_bucket, value, ttl=CACHE_TTL)
        return value

    value = await maps.get_duration_in_traffic(origin, destination, departure_ts, api_key)
    if value is not None:
        cache_module.set(origin, destination, day_of_week, time_bucket, value, ttl=CACHE_TTL)
    return value


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@app.post("/analyze-route", response_model=AnalyzeResponse)
async def analyze_route(req: AnalyzeRequest):
    if not req.origin.strip() or not req.destination.strip():
        raise HTTPException(status_code=400, detail="origin and destination are required")

    now = datetime.now()

    # Determine simulation window
    try:
        if req.start_time:
            window_start = _parse_time_input(req.start_time, now)
        else:
            window_start = now.replace(second=0, microsecond=0)

        if req.end_time:
            window_end = _parse_time_input(req.end_time, now)
        else:
            window_end = window_start + timedelta(hours=DEFAULT_WINDOW_HOURS)
    except (ValueError, AttributeError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid time format: {exc}")

    if window_end <= window_start:
        raise HTTPException(status_code=400, detail="end_time must be after start_time")

    # Build departure slots (every SIMULATION_INTERVAL_MIN minutes)
    slots: list[datetime] = []
    cursor = window_start
    while cursor <= window_end:
        slots.append(cursor)
        cursor += timedelta(minutes=SIMULATION_INTERVAL_MIN)

    if not slots:
        raise HTTPException(status_code=400, detail="No departure slots in the given window")

    # Fetch all durations concurrently
    tasks = [
        _fetch_with_cache(req.origin, req.destination, slot, GOOGLE_MAPS_API_KEY)
        for slot in slots
    ]
    results = await asyncio.gather(*tasks)

    # Build timeline (only slots with valid results)
    timeline: list[TimelineEntry] = []
    for slot, duration_sec in zip(slots, results):
        if duration_sec is None:
            continue
        timeline.append(
            TimelineEntry(
                time=slot.strftime("%H:%M"),
                timestamp=int(slot.timestamp()),
                duration=round(duration_sec / 60),
            )
        )

    if not timeline:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve traffic data. Check your API key and locations.",
        )

    # Current departure = first slot (closest to now)
    current_entry = timeline[0]
    current_duration = current_entry.duration

    # Best departure
    best_entry = min(timeline, key=lambda e: e.duration)
    best_duration = best_entry.duration
    best_departure_time = best_entry.time
    time_saved = max(0, current_duration - best_duration)

    return AnalyzeResponse(
        current_duration=current_duration,
        best_duration=best_duration,
        best_departure_time=best_departure_time,
        time_saved=time_saved,
        timeline=timeline,
        window_start=window_start.strftime("%H:%M"),
        window_end=window_end.strftime("%H:%M"),
    )


@app.get("/health")
def health():
    return {"status": "ok", "demo_mode": not bool(GOOGLE_MAPS_API_KEY)}
