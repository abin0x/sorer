import React from "react";
import { Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SPORTS } from "@/lib/tourDefaults";

const p = (a = 1) => `hsl(var(--primary)${a < 1 ? ` / ${a}` : ""})`;

export default function ClubNameStep({ clubName, setClubName, sport, setSport, isLive, clubExists }) {
  return (
    <div className="space-y-5">
      <StepHeader
        icon={Home}
        title="Name your club"
        subtitle="This is how your club appears across the app. You can change it later in settings."
      />

      <div className="space-y-4">
        <div>
          <Label className="mb-1.5 block text-slate-800 font-semibold">Club Name</Label>
          <Input
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            placeholder="e.g. Riverside Soccer Club"
            className="min-h-[44px] text-base"
            disabled={clubExists && isLive}
          />
          {clubExists && isLive && (
            <p className="text-xs text-slate-500 mt-1.5 font-medium">Your club is already created — you can rename it later in Settings.</p>
          )}
        </div>

        <div>
          <Label className="mb-1.5 block text-slate-800 font-semibold">Primary Sport</Label>
          <Select value={sport} onValueChange={setSport} disabled={clubExists && isLive}>
            <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPORTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: p(0.12) }}>
        <Icon className="w-5 h-5" style={{ color: p() }} />
      </div>
      <div>
        <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-600">{subtitle}</p>
      </div>
    </div>
  );
}