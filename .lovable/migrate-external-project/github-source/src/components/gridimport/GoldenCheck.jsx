import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { compareWithGolden } from "@/lib/gridExport";

/** Compares the raw parser output with an uploaded golden CSV (weekly_schedule.csv). */
export default function GoldenCheck({ records }) {
  const [res, setRes] = useState(null);
  const onFile = async (e) => {
    const f = e.target.files[0];
    if (f) setRes(compareWithGolden(await f.text(), records));
  };
  return (
    <div className="space-y-2 text-sm">
      <Input type="file" accept=".csv" onChange={onFile} />
      {res && (
        <div className={res.exact ? "text-green-700" : "text-red-600"}>
          {res.exact ? `Exact match: ${res.actualCount} rows.` : `Mismatch: golden has ${res.goldenCount} rows, parser produced ${res.actualCount}.${res.sameRowsAnyOrder ? " Same rows, different order." : ""}`}
          {res.diffs.map((d) => (
            <div key={d.row} className="mt-1 font-mono text-xs text-foreground">
              row {d.row}<br />expected: {d.expected}<br />actual: {d.actual}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}