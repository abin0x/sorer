import React from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkSubdomain, slugify } from "./tenantUtils";

export default function SubdomainField({ value, onChange, clubs, excludeId }) {
  const clean = slugify(value);
  const result = checkSubdomain(clean, clubs, excludeId);
  return (
    <div className="space-y-1.5">
      <Label>Subdomain</Label>
      <Input
        value={value}
        onChange={(e) => onChange(slugify(e.target.value))}
        placeholder="riverside"
        className={result.available ? "border-emerald-400 focus-visible:ring-emerald-400" : value ? "border-rose-400 focus-visible:ring-rose-400" : ""}
      />
      {value && (
        result.available ? (
          <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />{clean}.clubrudder.com available</p>
        ) : (
          <p className="text-xs text-rose-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{result.reason}</p>
        )
      )}
    </div>
  );
}