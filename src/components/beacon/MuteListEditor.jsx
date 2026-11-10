import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

export default function MuteListEditor({ mutes, onRemove }) {
  if (!mutes || mutes.length === 0) return null;
  return (
    <div className="space-y-2">
      <Label>Active mutes</Label>
      <div className="space-y-1.5">
        {mutes.map((m, i) => (
          <div key={`${m.scope}_${m.target_id}_${i}`} className="flex items-center justify-between px-3 py-2 rounded-xl border border-border bg-muted/40">
            <div className="text-sm text-foreground">
              {m.target_name || (m.scope === "team" ? "Team" : "Channel")}
              <span className="text-xs text-muted-foreground ml-1.5">
                {m.level === "muted" ? "muted" : "mentions only"} · {m.expires_at ? `until ${new Date(m.expires_at).toLocaleString()}` : "indefinitely"}
              </span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(m)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}