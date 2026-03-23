import React, { useState } from "react";

export default function LocationInput({ origin, destination, onChange }) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        // Reverse-geocode using a free nominatim endpoint
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr =
            data.display_name ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          onChange("origin", addr);
        } catch {
          onChange("origin", `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
        setLocating(false);
      },
      (err) => {
        setGeoError("Could not get your location. Please allow location access.");
        setLocating(false);
      }
    );
  }

  return (
    <div className="space-y-3">
      {/* Origin */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          From
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={origin}
            onChange={(e) => onChange("origin", e.target.value)}
            placeholder="e.g. Meggen, Switzerland"
            className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          />
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            title="Use my current location"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-60 transition-colors flex-shrink-0"
          >
            {locating ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>
        {geoError && (
          <p className="mt-1 text-xs text-red-500">{geoError}</p>
        )}
      </div>

      {/* Destination */}
      <div>
        <label className="block text-sm font-medium text-slate-600 mb-1">
          To
        </label>
        <input
          type="text"
          value={destination}
          onChange={(e) => onChange("destination", e.target.value)}
          placeholder="e.g. Bremgarten, Switzerland"
          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
        />
      </div>
    </div>
  );
}
