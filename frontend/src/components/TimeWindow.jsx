import React, { useState } from "react";

export default function TimeWindow({ startTime, endTime, onChange }) {
  const [expanded, setExpanded] = useState(false);

  function handleClear() {
    onChange("startTime", "");
    onChange("endTime", "");
    setExpanded(false);
  }

  const hasValues = startTime || endTime;

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
      >
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {hasValues ? (
          <span>
            Time window: {startTime || "now"} – {endTime || "+2h"}
          </span>
        ) : (
          <span>Set departure window (optional)</span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Earliest departure
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => onChange("startTime", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Latest departure
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => onChange("endTime", e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
            />
          </div>
          {hasValues && (
            <div className="col-span-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Clear window (use defaults)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
