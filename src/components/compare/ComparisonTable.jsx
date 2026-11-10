import React from "react";

/**
 * Two-column comparison table: our facts against the competitor's
 * [VERIFY: …] placeholders. Scrolls horizontally on narrow screens so the
 * whole table stays in the DOM (one copy of the text, crawlable).
 */
export default function ComparisonTable({ rows, competitor }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left">
        <thead>
          <tr>
            <th className="w-[26%] p-3 border-b border-slate-200 dark:border-[#2a3a33]">
              <span className="sr-only">Comparison criteria</span>
            </th>
            <th className="p-3 text-sm font-extrabold uppercase tracking-wider text-primary border-b border-slate-200 dark:border-[#2a3a33]">
              Club Rudder
            </th>
            <th className="p-3 text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-[#2a3a33]">
              {competitor}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="align-top">
              <th
                scope="row"
                className="p-3 text-sm font-bold text-slate-900 dark:text-[#F5F1E8] border-t border-slate-200 dark:border-[#2a3a33]"
              >
                {row.label}
              </th>
              <td className="p-3 text-sm text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-[#2a3a33]">
                {row.club}
              </td>
              <td className="p-3 border-t border-slate-200 dark:border-[#2a3a33]">
                <span className="inline-block rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
                  [VERIFY: {competitor} {row.verifyLabel}]
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}