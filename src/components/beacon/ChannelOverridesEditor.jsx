import React from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CHANNEL_TYPE_LABELS } from "@/lib/beaconChannels";

export default function ChannelOverridesEditor({ channels, overrides, onChange }) {
  const set = (channelId, value) => onChange({ ...overrides, [channelId]: value });

  if (channels.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Per-channel overrides</Label>
      <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
        {channels.map((ch) => (
          <div key={ch.id} className="flex items-center justify-between px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm text-foreground truncate">{ch.name}</p>
              <p className="text-[11px] text-muted-foreground">{CHANNEL_TYPE_LABELS[ch.type]}</p>
            </div>
            <Select value={overrides[ch.id] || "default"} onValueChange={(v) => set(ch.id, v === "default" ? undefined : v)}>
              <SelectTrigger className="w-32 h-8 text-xs shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Use preset</SelectItem>
                <SelectItem value="push">Push</SelectItem>
                <SelectItem value="badge">Badge only</SelectItem>
                <SelectItem value="digest">Daily digest</SelectItem>
                <SelectItem value="off">Off</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}