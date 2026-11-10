import React from "react";
import { CSV_HEADERS } from "@/lib/trainingGridParser";

export default function PreviewTable({ records }) {
  if (!records.length) {
    return <p className="text-sm text-muted-foreground py-8 text-center">No rows to preview.</p>;
  }
  return (
    <div className="overflow-auto border rounded-lg" style={{ maxHeight: "60vh" }}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50 backdrop-blur">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-muted-foreground w-10">#</th>
            {CSV_HEADERS.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i} className="border-t hover:bg-muted/30">
              <td className="px-3 py-1.5 text-muted-foreground text-xs">{i + 1}</td>
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}