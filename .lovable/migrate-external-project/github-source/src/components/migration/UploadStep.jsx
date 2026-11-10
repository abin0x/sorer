import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Users, Shield, CalendarClock, Wallet, CheckCircle2, Loader2 } from "lucide-react";

import ImportFileGuide from '@/components/migration/ImportFileGuide';
import countMigrationCsvRows from '@/lib/countMigrationCsvRows';

const SLOTS = [
  { key: "members", label: "Members & Families", icon: Users },
  { key: "teams", label: "Teams & Rosters", icon: Shield },
  { key: "events", label: "Schedules & Events", icon: CalendarClock },
  { key: "payments", label: "Payment History", icon: Wallet },
];

export default function UploadStep({ files, onFilesChange, onProcess, processing }) {
  const [uploadingKey, setUploadingKey] = useState(null);

  const handleFile = async (key, file) => {
    if (!file) return;
    setUploadingKey(key);
    try {
      const [{ file_uri }, row_count] = await Promise.all([
        base44.integrations.Core.UploadPrivateFile({ file }),
        /\.csv$/i.test(file.name) ? countMigrationCsvRows(file) : Promise.resolve(null),
      ]);
      onFilesChange({ ...files, [key]: { file_uri, file_name: file.name, row_count } });
    } finally {
      setUploadingKey(null);
    }
  };

  const hasAnyFile = SLOTS.some((s) => files[s.key]?.file_uri);

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-extrabold text-slate-900">Upload your export files</h2>
        <p className="text-sm text-slate-500 mt-1">Add at least one file. You don't need all four — upload what you have.</p>
      </div>
      <ImportFileGuide />
      <div className="grid sm:grid-cols-2 gap-3">
        {SLOTS.map((slot) => {
          const Icon = slot.icon;
          const uploaded = files[slot.key];
          const isUploading = uploadingKey === slot.key;
          return (
            <label
              key={slot.key}
              className={`flex items-center gap-3 p-4 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                uploaded ? "border-primary bg-primary/5" : "border-slate-200 hover:border-primary/50"
              }`}
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                {isUploading ? <Loader2 className="w-5 h-5 text-primary animate-spin" /> : <Icon className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900">{slot.label}</p>
                <p className="text-xs text-slate-500 truncate">
                  {uploaded ? uploaded.file_name : "Click to upload CSV or Excel"}
                </p>
              </div>
              {uploaded && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => handleFile(slot.key, e.target.files?.[0])}
              />
            </label>
          );
        })}
      </div>
      <Button disabled={!hasAnyFile || processing || uploadingKey} onClick={onProcess} className="w-full gap-2">
        {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</> : "Process My Files"}
      </Button>
    </div>
  );
}