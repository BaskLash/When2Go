import React from "react";

function barWidth(duration, min, max) {
  if (max === min) return 100;
  return Math.round(((max - duration) / (max - min)) * 70 + 30); // 30–100%
}

export default function Timeline({ timeline, bestDeparture }) {
  if (!timeline || timeline.length === 0) return null;

  const durations = timeline.map((e) => e.duration);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);

  // Find best window (entries within 3 min of best)
  const bestWindowThreshold = 3;

  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-600 mb-3 uppercase tracking-wide">
        Departure timeline
      </h3>
      <div className="space-y-1.5">
        {timeline.map((entry) => {
          const isBest = entry.time === bestDeparture;
          const isNearBest = Math.abs(entry.duration - minDur) <= bestWindowThreshold;
          const width = barWidth(entry.duration, minDur, maxDur);

          return (
            <div
              key={entry.time}
              className={`relative rounded-xl overflow-hidden ${
                isBest
                  ? "ring-2 ring-brand-500"
                  : ""
              }`}
            >
              {/* Background bar */}
              <div
                className={`absolute inset-y-0 left-0 rounded-xl transition-all ${
                  isBest
                    ? "bg-brand-100"
                    : isNearBest
                    ? "bg-sky-50"
                    : "bg-slate-100"
                }`}
                style={{ width: `${width}%` }}
              />

              {/* Content */}
              <div className="relative flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-sm font-mono font-medium w-12 ${
                      isBest ? "text-brand-700" : "text-slate-600"
                    }`}
                  >
                    {entry.time}
                  </span>
                  {isBest && (
                    <span className="text-xs bg-brand-500 text-white rounded-full px-2 py-0.5 font-medium leading-none">
                      Best
                    </span>
                  )}
                  {!isBest && isNearBest && (
                    <span className="text-xs bg-sky-100 text-sky-700 rounded-full px-2 py-0.5 font-medium leading-none">
                      Good
                    </span>
                  )}
                </div>
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    isBest ? "text-brand-700" : "text-slate-500"
                  }`}
                >
                  {entry.duration} min
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-brand-100 ring-1 ring-brand-400" />
          Best time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-50 ring-1 ring-sky-200" />
          Good window
        </span>
      </div>
    </div>
  );
}
