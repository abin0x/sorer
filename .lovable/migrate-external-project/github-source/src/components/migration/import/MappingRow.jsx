import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ValueMapEditor from "./ValueMapEditor";

function confBadge(conf, status) {
  if (!conf || status === "unmapped") return <Badge variant="outline" className="text-slate-400">unmapped</Badge>;
  if (status === "ignored") return <Badge variant="outline" className="text-slate-400">ignored</Badge>;
  if (status === "kept") return <Badge variant="outline" className="text-slate-400">kept in source</Badge>;
  const pct = Math.round(conf * 100);
  const tone = conf >= 0.8 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
  return <Badge className={tone}>{status === "auto" ? "auto" : "suggested"} {pct}%</Badge>;
}

export default function MappingRow({ row, target, duplicate, onChange }) {
  const options = target?.options || [];
  const isEnum = target?.type === "enum";
  const showValueMap = isEnum && row.target_field && row.unique_values?.length > 0;

  return (
    <div className={`rounded-lg border p-3 ${duplicate ? "border-red-300 bg-red-50" : "border-slate-200"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-[160px]">
          <p className="font-medium text-sm text-slate-900">{row.source_column}</p>
          {row.group > 0 && <p className="text-xs text-indigo-600">{row.group_label}</p>}
          {row.samples?.length > 0 && (
            <p className="text-xs text-slate-400 mt-0.5 truncate">e.g. {row.samples.join(", ")}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {confBadge(row.confidence, row.status)}
        </div>

        <div className="w-[200px]">
          <Select
            value={row.target_field || "__none"}
            onValueChange={(v) => onChange(row.id, { target_field: v === "__none" ? "" : v, status: v === "__none" ? "unmapped" : "edited" })}
          >
            <SelectTrigger><SelectValue placeholder="— unmapped —" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— unmapped —</SelectItem>
              {target?.fields?.map((f) => (
                <SelectItem key={f.name} value={f.name}>
                  {f.label}{f.required ? " *" : ""}{f.link ? " (link)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1">
          {!row.target_field && (
            <>
              <Button size="sm" variant="outline" onClick={() => onChange(row.id, { status: "ignored", target_field: "" })}>Ignore</Button>
              <Button size="sm" variant="outline" onClick={() => onChange(row.id, { status: "kept", target_field: "" })}>Keep</Button>
            </>
          )}
        </div>
      </div>

      {duplicate && <p className="text-xs text-red-600 mt-1.5">Another column also maps to this field — pick one.</p>}

      {showValueMap && (
        <div className="mt-2">
          <ValueMapEditor
            uniqueValues={row.unique_values}
            valueMap={row.value_map || {}}
            options={options}
            onChange={(vm) => onChange(row.id, { value_map: vm })}
          />
        </div>
      )}
    </div>
  );
}