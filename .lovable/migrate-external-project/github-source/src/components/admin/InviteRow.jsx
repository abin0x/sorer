import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { ROLE_LABELS } from "@/lib/rbac";

export default function InviteRow({ row, availableRoles, systemOnlyRoles, onChange, onRemove }) {
  const locked = row.status && row.status !== "idle";
  const initial = (row.full_name || row.email || "?").trim()[0]?.toUpperCase() || "?";

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[auto_1fr_1.2fr_1fr_auto] gap-2 items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
            row.status === "sent"
              ? "bg-emerald-100 text-emerald-700"
              : row.status === "failed"
              ? "bg-red-100 text-red-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {initial}
        </div>
        <Input
          placeholder="Name (optional)"
          value={row.full_name}
          onChange={(e) => onChange({ ...row, full_name: e.target.value })}
          className="h-9"
          disabled={locked}
        />
        <Input
          type="email"
          placeholder="name@example.com"
          value={row.email}
          onChange={(e) => onChange({ ...row, email: e.target.value })}
          className="h-9"
          disabled={locked}
        />
        <Select value={row.role} onValueChange={(v) => onChange({ ...row, role: v })} disabled={locked}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {availableRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
                {systemOnlyRoles.includes(r) && <span className="text-xs text-amber-600 ml-1">(system only)</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="w-9 h-9 flex items-center justify-center">
          {row.status === "sending" && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
          {row.status === "sent" && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
          {row.status === "failed" && <XCircle className="w-4 h-4 text-red-500" />}
          {!locked && (
            <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-red-600" onClick={onRemove}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
      {row.status === "failed" && row.error && <p className="text-xs text-red-600 pl-10">{row.error}</p>}
      {row.status === "sent" && <p className="text-xs text-emerald-600 pl-10">Invitation sent</p>}
    </div>
  );
}