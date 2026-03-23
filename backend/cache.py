"""
Simple in-memory cache with TTL support.
Cache key: (origin, destination, day_of_week, time_bucket_minutes)
"""
import time
from typing import Any, Optional

_store: dict[str, tuple[Any, float]] = {}


def _make_key(origin: str, destination: str, day_of_week: int, time_bucket: int) -> str:
    return f"{origin.lower().strip()}|{destination.lower().strip()}|{day_of_week}|{time_bucket}"


def get(origin: str, destination: str, day_of_week: int, time_bucket: int) -> Optional[Any]:
    key = _make_key(origin, destination, day_of_week, time_bucket)
    entry = _store.get(key)
    if entry is None:
        return None
    value, expires_at = entry
    if time.time() > expires_at:
        del _store[key]
        return None
    return value


def set(origin: str, destination: str, day_of_week: int, time_bucket: int, value: Any, ttl: int = 1200) -> None:
    key = _make_key(origin, destination, day_of_week, time_bucket)
    _store[key] = (value, time.time() + ttl)


def clear_expired() -> int:
    now = time.time()
    expired = [k for k, (_, exp) in _store.items() if now > exp]
    for k in expired:
        del _store[k]
    return len(expired)
