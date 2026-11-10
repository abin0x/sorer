import React, { useEffect, useState } from "react";
import { DEV_MOCK_ENABLED, MOCK_ROLES, getDevMock, setDevMock } from "@/lib/devMock";

export default function DevMockPanel() {
  const [mock, setMock] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => setMock(getDevMock()), []);
  if (!DEV_MOCK_ENABLED) return null;
  return (
    <div className="fixed bottom-3 left-3 z-[9999] text-xs">
      {open ? (
        <div className="rounded-lg border border-border bg-card text-card-foreground shadow-lg p-3 w-56 space-y-2">
          <div className="font-semibold">Dev preview: act as</div>
          {Object.entries(MOCK_ROLES).map(([k, r]) => (
            <button key={k} onClick={() => setDevMock(k)}
              className={`block w-full text-left rounded px-2 py-1 hover:bg-muted ${mock?.id === `mock-${k}` ? "bg-primary text-primary-foreground" : ""}`}>
              {r.label} · Demo FC
            </button>
          ))}
          <button onClick={() => setDevMock(null)} className="block w-full text-left rounded px-2 py-1 hover:bg-muted text-muted-foreground">
            Turn off (real sign-in)
          </button>
          <button onClick={() => setOpen(false)} className="text-muted-foreground underline">close</button>
        </div>
      ) : (
        <button aria-label="Dev preview mode" onClick={() => setOpen(true)}
          className="rounded-full bg-primary text-primary-foreground px-3 py-1 shadow">
          {mock ? `Mock: ${mock.full_name}` : "Dev mock"}
        </button>
      )}
    </div>
  );
}
