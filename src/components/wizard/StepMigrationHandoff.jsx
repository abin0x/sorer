import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadCloud, SkipForward, User } from "lucide-react";

export default function StepMigrationHandoff({ club, onStartMigration, onSkip, onBack }) {
  const [busy, setBusy] = useState(false);

  const handle = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Step 4 of 4 — Bring Your Data Over</h2>
        <p className="text-sm text-slate-500">You're almost ready. Let's migrate your club's data into Club Rudder.</p>
      </div>

      <div className="rounded-xl border border-slate-200 p-5 space-y-3">
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">✓ Upload your export file</li>
          <li className="flex items-center gap-2">✓ We map it automatically</li>
          {club.assigned_specialist_name && <li className="flex items-center gap-2">✓ {club.assigned_specialist_name} reviews it personally</li>}
          <li className="flex items-center gap-2">✓ You go live — usually within 24 hours</li>
        </ul>
        {club.assigned_specialist_name && (
          <div className="flex items-center gap-2 text-sm text-slate-500 pt-2 border-t border-slate-100">
            <User className="w-4 h-4" /> Assigned specialist: <span className="font-semibold text-slate-700">{club.assigned_specialist_name}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3 justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => handle(onSkip)} className="gap-2">
            <SkipForward className="w-4 h-4" /> Skip for Now
          </Button>
          <Button disabled={busy} onClick={() => handle(onStartMigration)} className="gap-2">
            <UploadCloud className="w-4 h-4" /> Start Migration
          </Button>
        </div>
      </div>
    </div>
  );
}