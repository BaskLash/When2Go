import React from "react";

function MinuteBadge({ minutes, highlight }) {
  return (
    <span
      className={`inline-flex items-baseline gap-0.5 font-bold tabular-nums ${
        highlight ? "text-brand-600" : "text-slate-700"
      }`}
    >
      <span className="text-4xl leading-none">{minutes}</span>
      <span className="text-base font-medium text-slate-500">min</span>
    </span>
  );
}

export default function ResultSummary({ result, sessionSaved }) {
  const { current_duration, best_duration, best_departure_time, time_saved } = result;

  const savingMessage =
    time_saved > 0
      ? `Wait ${timeDiff(result.timeline)} minutes → save ${time_saved} minutes`
      : "Leaving now is already the best option!";

  return (
    <div className="space-y-4">
      {/* Main cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Leave now
          </p>
          <MinuteBadge minutes={current_duration} />
          <p className="text-xs text-slate-400 mt-1">travel time</p>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm border ${
          time_saved > 0
            ? "bg-brand-500 border-brand-600 text-white"
            : "bg-white border-slate-100"
        }`}>
          <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${
            time_saved > 0 ? "text-brand-100" : "text-slate-400"
          }`}>
            Best departure
          </p>
          <span className={`inline-flex items-baseline gap-0.5 font-bold tabular-nums ${
            time_saved > 0 ? "text-white" : "text-slate-700"
          }`}>
            <span className="text-4xl leading-none">{best_duration}</span>
            <span className={`text-base font-medium ${time_saved > 0 ? "text-brand-200" : "text-slate-500"}`}>min</span>
          </span>
          <p className={`text-xs mt-1 ${time_saved > 0 ? "text-brand-100" : "text-slate-400"}`}>
            at {best_departure_time}
          </p>
        </div>
      </div>

      {/* Insight pill */}
      {time_saved > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-emerald-500 text-lg mt-0.5">💡</span>
          <div>
            <p className="text-sm font-semibold text-emerald-800">
              You save {time_saved} minutes
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">{savingMessage}</p>
          </div>
        </div>
      )}

      {time_saved === 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 flex items-start gap-3">
          <span className="text-slate-400 text-lg mt-0.5">✓</span>
          <p className="text-sm text-slate-600">{savingMessage}</p>
        </div>
      )}

      {/* Session savings */}
      {sessionSaved > 0 && (
        <div className="text-center">
          <p className="text-xs text-slate-400">
            Today you've saved{" "}
            <span className="font-semibold text-brand-600">{sessionSaved} minutes</span>{" "}
            with When2Go
          </p>
        </div>
      )}
    </div>
  );
}

function timeDiff(timeline) {
  if (!timeline || timeline.length < 2) return "a few";
  const first = timeline[0];
  const best = timeline.reduce((a, b) => (a.duration < b.duration ? a : b));
  const diffMs = (best.timestamp - first.timestamp) * 1000;
  return Math.round(diffMs / 1000 / 60);
}
