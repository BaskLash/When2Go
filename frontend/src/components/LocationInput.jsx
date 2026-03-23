import React, { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSuggestion(feature) {
  const p = feature.properties;
  const street = p.street || p.name;
  const number = p.housenumber;
  const city = p.city || p.town || p.village;
  const country = p.country;

  const streetPart = street ? (number ? `${street} ${number}` : street) : null;
  return [streetPart, city, country].filter(Boolean).join(", ");
}

// ---------------------------------------------------------------------------
// AddressInput — single autocomplete field
// ---------------------------------------------------------------------------

function AddressInput({ value, onChange, placeholder, id, wrapperClassName = "" }) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const lastSentRef = useRef(value);

  // Sync externally-driven value changes (e.g. geolocation fills the field)
  useEffect(() => {
    if (value !== lastSentRef.current) {
      setQuery(value);
      lastSentRef.current = value;
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    setQuery(val);
    lastSentRef.current = val;
    onChange(val);
    setActiveIdx(-1);

    clearTimeout(debounceRef.current);

    if (val.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://photon.komoot.io/api/?q=${encodeURIComponent(val)}&limit=6`
        );
        const data = await res.json();
        const features = data.features || [];
        setSuggestions(features);
        setOpen(features.length > 0);
      } catch {
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
  }

  function select(feature) {
    const label = formatSuggestion(feature);
    setQuery(label);
    lastSentRef.current = label;
    onChange(label);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      <input
        type="text"
        id={id}
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {suggestions.map((feature, idx) => (
            <li
              key={idx}
              onMouseDown={() => select(feature)}
              className={`px-3 py-2.5 text-sm cursor-pointer flex items-start gap-2 ${
                idx === activeIdx
                  ? "bg-brand-500 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                  idx === activeIdx ? "text-white" : "text-slate-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>{formatSuggestion(feature)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// LocationInput — From / To pair
// ---------------------------------------------------------------------------

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
      () => {
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
          <AddressInput
            id="origin"
            value={origin}
            onChange={(val) => onChange("origin", val)}
            placeholder="e.g. Meggen, Switzerland"
            wrapperClassName="flex-1"
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
        <AddressInput
          id="destination"
          value={destination}
          onChange={(val) => onChange("destination", val)}
          placeholder="e.g. Bremgarten, Switzerland"
        />
      </div>
    </div>
  );
}
