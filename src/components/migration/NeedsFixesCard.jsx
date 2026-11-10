import React from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NeedsFixesCard({ job, onRetry }) {
  return (
    <div className="space-y-4 text-center">
      <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">A few things need attention</h2>
        <p className="text-sm text-slate-500 mt-1">Our support team reviewed your migration and flagged something.</p>
      </div>
      {job.specialist_notes && (
        <div className="text-left flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-xs font-bold text-amber-700">
            {job.specialist_name?.[0]?.toUpperCase() || "S"}
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{job.specialist_name || "Club Rudder Support"}</p>
            <p className="text-sm text-slate-600 mt-0.5">"{job.specialist_notes}"</p>
          </div>
        </div>
      )}
      <Button onClick={onRetry} className="w-full">Re-upload Your Files</Button>
    </div>
  );
}