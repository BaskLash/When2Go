import React, { useState, useEffect } from "react";
import LocationInput from "./components/LocationInput";
import TimeWindow from "./components/TimeWindow";
import ResultSummary from "./components/ResultSummary";
import Timeline from "./components/Timeline";

const API_BASE = process.env.REACT_APP_API_URL || "";

export default function App() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [sessionSaved, setSessionSaved] = useState(0);

  // Load session savings from sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("when2go_saved_minutes");
    if (saved) setSessionSaved(parseInt(saved, 10));
  }, []);

  function handleChange(field, value) {
    if (field === "origin") setOrigin(value);
    else if (field === "destination") setDestination(value);
    else if (field === "startTime") setStartTime(value);
    else if (field === "endTime") setEndTime(value);
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) {
      setError("Please enter both origin and destination.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);

    const body = {
      origin: origin.trim(),
      destination: destination.trim(),
    };
    if (startTime) body.start_time = startTime;
    if (endTime) body.end_time = endTime;

    try {
      const res = await fetch(`${API_BASE}/analyze-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || `Server error ${res.status}`);
      }

      const data = await res.json();
      setResult(data);

      // Accumulate session savings
      if (data.time_saved > 0) {
        const newTotal = sessionSaved + data.time_saved;
        setSessionSaved(newTotal);
        sessionStorage.setItem("when2go_saved_minutes", newTotal.toString());
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-500 shadow-sm">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">When2Go</h1>
            <p className="text-xs text-slate-400 mt-0.5">Find the best time to leave</p>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-6 space-y-5">
        {/* Input card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <LocationInput
              origin={origin}
              destination={destination}
              onChange={handleChange}
            />

            <div className="border-t border-slate-100 pt-3">
              <TimeWindow
                startTime={startTime}
                endTime={endTime}
                onChange={handleChange}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                <svg className="h-4 w-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-brand-500 text-white font-semibold shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Analyzing traffic...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analyze
                </>
              )}
            </button>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="space-y-4 animate-fade-in">
            {/* Route label */}
            <div className="flex items-center gap-2 text-xs text-slate-400 px-1">
              <span className="font-medium text-slate-500 truncate">{origin}</span>
              <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              <span className="font-medium text-slate-500 truncate">{destination}</span>
            </div>

            {/* Summary card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <ResultSummary result={result} sessionSaved={sessionSaved} />
            </div>

            {/* Timeline card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
              <Timeline
                timeline={result.timeline}
                bestDeparture={result.best_departure_time}
              />
            </div>

            {/* Notification hint */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-amber-400 text-base mt-0.5">🔔</span>
              <div>
                <p className="text-xs font-semibold text-amber-700">
                  Coming soon: Smart notifications
                </p>
                <p className="text-xs text-amber-600 mt-0.5">
                  We'll alert you at the perfect moment to leave, so you don't have to keep checking.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && (
          <div className="text-center py-10 text-slate-300">
            <svg className="h-16 w-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-sm">Enter your route and hit Analyze</p>
            <p className="text-xs mt-1">We'll find the best time for you to leave</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-300">
        When2Go · Car travel only · Powered by real traffic data
      </footer>
    </div>
  );
}
