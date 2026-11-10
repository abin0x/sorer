import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

const TIMEZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Phoenix"];

export default function QuietHoursEditor({ quietHours, onChange }) {
  const qh = quietHours || {};
  const set = (patch) => onChange({ ...qh, ...patch });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label>Quiet hours</Label>
          <p className="text-xs text-muted-foreground">Hold notifications during this window, then deliver one summary when it ends.</p>
        </div>
        <Switch checked={!!qh.enabled} onCheckedChange={(v) => set({ enabled: v })} />
      </div>

      {qh.enabled && (
        <div className="space-y-3 pl-1 border-l-2 border-border ml-1 pl-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Weekday start</Label>
              <Input type="time" value={qh.weekday_start || "21:00"} onChange={(e) => set({ weekday_start: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Weekday end</Label>
              <Input type="time" value={qh.weekday_end || "07:00"} onChange={(e) => set({ weekday_end: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Weekend start</Label>
              <Input type="time" value={qh.weekend_start || "22:00"} onChange={(e) => set({ weekend_start: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Weekend end</Label>
              <Input type="time" value={qh.weekend_end || "08:00"} onChange={(e) => set({ weekend_end: e.target.value })} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Time zone</Label>
            <ResponsiveSelect
              className="w-full h-9 mt-1"
              value={qh.timezone || "America/New_York"}
              onChange={(v) => set({ timezone: v })}
              label="Time zone"
              options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Priority messages break through</Label>
            <Switch checked={qh.priority_override !== false} onCheckedChange={(v) => set({ priority_override: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">Imminent schedule changes break through</Label>
            <Switch checked={qh.schedule_override !== false} onCheckedChange={(v) => set({ schedule_override: v })} />
          </div>
        </div>
      )}
    </div>
  );
}