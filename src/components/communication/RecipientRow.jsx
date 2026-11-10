import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone } from "lucide-react";

const ROLE_STYLES = {
  coach: "bg-blue-50 text-blue-700 border-blue-200",
  parent: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function RecipientRow({ recipient, checked, onToggle }) {
  return (
    <div
      className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/30 cursor-pointer border border-transparent"
      onClick={() => onToggle(recipient.key)}
    >
      <Checkbox checked={checked} className="mt-0.5 pointer-events-none" />
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
        {recipient.name?.split(" ").map((n) => n[0]).slice(0, 2).join("")}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{recipient.name}</span>
          <Badge variant="outline" className={`text-[10px] capitalize ${ROLE_STYLES[recipient.type]}`}>{recipient.type}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {recipient.email && (
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{recipient.email}</span>
          )}
          {recipient.phone && (
            <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{recipient.phone}</span>
          )}
        </div>
        {recipient.type === "parent" && recipient.players?.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {recipient.players.map((p) => (
              <Badge key={p} variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">{p}</Badge>
            ))}
          </div>
        )}
        {recipient.type === "coach" && recipient.teams?.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {recipient.teams.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">{t}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}