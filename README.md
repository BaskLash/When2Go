# When2Go

> **Find the best time to leave. Beat traffic. Save time.**

When2Go helps you decide *when* to depart by simulating multiple departure times and comparing expected travel durations using real traffic data. It answers:

- "If I leave now, how long will it take?"
- "If I wait, can I save time?"
- "What is the optimal departure time within the next 2 hours?"

---

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | React 18, Tailwind CSS            |
| Backend  | FastAPI (Python 3.10+)            |
| Traffic  | Google Maps Distance Matrix API   |
| Cache    | In-memory (TTL 20 min)            |

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- A [Google Maps Platform API key](https://console.cloud.google.com/) with **Distance Matrix API** enabled

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit .env and add your GOOGLE_MAPS_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Without an API key the backend runs in **demo mode** with simulated traffic data (great for UI development).

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`.

> The frontend proxies `/analyze-route` to `http://localhost:8000` via the `proxy` field in `package.json`.

---

## API

### `POST /analyze-route`

**Request**
```json
{
  "origin": "Meggen, Switzerland",
  "destination": "Bremgarten, Switzerland",
  "start_time": "17:00",
  "end_time": "19:00"
}
```
`start_time` and `end_time` are optional. Omitting them defaults to **now → now + 2 hours**.

**Response**
```json
{
  "current_duration": 55,
  "best_duration": 37,
  "best_departure_time": "17:40",
  "time_saved": 18,
  "timeline": [
    { "time": "17:00", "timestamp": 1700000000, "duration": 55 },
    { "time": "17:10", "timestamp": 1700000600, "duration": 50 },
    ...
  ],
  "window_start": "17:00",
  "window_end": "19:00"
}
```

### `GET /health`

Returns `{ "status": "ok", "demo_mode": false }`.

---

## Features

- **Location input** with "Use my location" button (browser geolocation + reverse geocoding)
- **Optional time window** (defaults to now → +2 hours)
- **Traffic simulation** every 10 minutes across the window
- **In-memory caching** keyed by origin, destination, day-of-week, and 10-minute bucket (TTL 20 min)
- **Clear summary**: leave-now time vs. best time, minutes saved
- **Visual timeline** with best/good departure windows highlighted
- **Session savings tracker**: "Today you saved X minutes"
- **Demo mode**: works without an API key for UI development/testing

---

## Environment Variables

| Variable            | Default | Description                          |
|---------------------|---------|--------------------------------------|
| `GOOGLE_MAPS_API_KEY` | *(empty)* | Maps API key; omit for demo mode   |
| `CACHE_TTL_SECONDS`   | `1200`  | Cache entry lifetime in seconds      |

---

## Project Structure

```
When2Go/
├── backend/
│   ├── main.py          # FastAPI app + route analysis logic
│   ├── maps.py          # Google Maps Distance Matrix client
│   ├── cache.py         # In-memory TTL cache
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── LocationInput.jsx   # Origin/destination + geolocation
│   │   │   ├── TimeWindow.jsx      # Optional departure window picker
│   │   │   ├── ResultSummary.jsx   # Big summary cards
│   │   │   └── Timeline.jsx        # Visual departure timeline
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
├── .env.example
├── .gitignore
└── README.md
```
