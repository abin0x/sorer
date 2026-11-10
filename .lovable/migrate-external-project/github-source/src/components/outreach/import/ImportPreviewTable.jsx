import React from "react";
import { Badge } from "@/components/ui/badge";

const STYLE = {
  Ready: "bg-green-100 text-green-700",
  Duplicate: "bg-amber-100 text-amber-700",
  Suppressed: "bg-slate-200 text-slate-700",
  "Invalid email": "bg-red-100 text-red-700",
  "Missing required field": "bg-red-100 text-red-700",
};

export default function ImportPreviewTable({ records, statuses }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-auto max-h-96">
      <table className="w-full text-xs">
        <thead className="bg-slate-50 sticky top-0">
          <tr>
            {["#", "Status", "Name", "Email", "Club", "Title", "Branches", "Players"].map((h) => (
              <th key={h} className="text-left px-2 py-1.5 font-semibold text-slate-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.slice(0, 200).map((r, i) => (
            <tr key={i} className="border-t border-slate-100">
              <td className="px-2 py-1 text-slate-400">{i + 1}</td>
              <td className="px-2 py-1"><Badge className={STYLE[statuses[i]] || ""}>{statuses[i]}</Badge></td>
              <td className="px-2 py-1">{r.first_name} {r.last_name}</td>
              <td className="px-2 py-1">{r.email}</td>
              <td className="px-2 py-1">{r.club_name}</td>
              <td className="px-2 py-1">{r.title}</td>
              <td className="px-2 py-1">{r.branch_count}</td>
              <td className="px-2 py-1">{r.player_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {records.length > 200 && <p className="p-2 text-xs text-slate-400">Showing first 200 of {records.length} rows.</p>}
    </div>
  );
}