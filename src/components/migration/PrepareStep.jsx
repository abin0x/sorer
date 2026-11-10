import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowRight } from "lucide-react";

const SOURCES = [
  { value: "teamsnap", label: "TeamSnap" },
  { value: "sportsengine", label: "SportsEngine" },
  { value: "sprocket", label: "Sprocket" },
  { value: "leagueapps", label: "LeagueApps" },
  { value: "playmetrics", label: "PlayMetrics" },
  { value: "spreadsheet_other", label: "Spreadsheet / Other" },
];

export default function PrepareStep({ onStart, starting }) {
  const [source, setSource] = useState("");

  return (
    <div className="max-w-md mx-auto text-center space-y-5 py-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-900">Where are you migrating from?</h2>
        <p className="text-sm text-slate-500 mt-1">
          We'll tailor the import to your export format. Upload, click migrate, and watch it flow — our support
          team reviews every migration personally before you go live.
        </p>
      </div>
      <Select value={source} onValueChange={setSource}>
        <SelectTrigger><SelectValue placeholder="Select your current platform…" /></SelectTrigger>
        <SelectContent>
          {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button disabled={!source || starting} onClick={() => onStart(source)} className="w-full gap-2">
        {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Start Your Migration <ArrowRight className="w-4 h-4" /></>}
      </Button>
    </div>
  );
}