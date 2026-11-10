import React from "react";

export default function COEMetricDetails({ details }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
      {details.map(d => (
        <div key={d.label} className="bg-white border border-gray-200 rounded-lg p-2.5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">{d.label}</p>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-[9px] text-gray-400 font-semibold">BEST</p>
              <p className="text-sm font-extrabold text-gray-900">{d.best ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-400 font-semibold">AVG</p>
              <p className="text-sm font-semibold text-gray-500">{d.average ?? "—"}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}