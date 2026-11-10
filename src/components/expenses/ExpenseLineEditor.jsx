import React from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Paperclip, Upload } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { calcLineAmount, round2 } from "@/lib/expenseHelpers";

/** One expense line row: type, date, amount/miles/days, and receipts. Teams are set at the report level. */
export default function ExpenseLineEditor({ line, expenseTypes, onChange, onRemove, readOnly }) {
  const expenseType = expenseTypes.find((t) => t.id === line.expense_type_id);

  const update = (patch) => onChange({ ...line, ...patch });

  const handleTypeChange = (typeId) => {
    const type = expenseTypes.find((t) => t.id === typeId);
    update({
      expense_type_id: typeId,
      expense_type_name: type?.name || "",
      calculation_method: type?.calculation_method || "flat",
      rate_used: type?.calculation_method === "flat" ? undefined : type?.rate || 0,
      amount: 0,
    });
  };

  const handleNumberField = (field, value) => {
    const patch = { [field]: value };
    const draft = { ...line, ...patch };
    patch.amount = calcLineAmount(draft, expenseType);
    update(patch);
  };

  const handleUploadReceipt = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    const me = await base44.auth.me().catch(() => null);
    update({
      receipts: [...(line.receipts || []), { file_uri, file_name: file.name, uploaded_by_name: me?.full_name || "", uploaded_date: new Date().toISOString() }],
    });
  };

  const removeReceipt = (idx) => update({ receipts: (line.receipts || []).filter((_, i) => i !== idx) });

  return (
    <div className="rounded-xl border border-border/60 p-3 space-y-3 bg-muted/20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Date</Label>
          <Input type="date" value={line.line_date || ""} disabled={readOnly} onChange={(e) => update({ line_date: e.target.value })} className="h-8 text-sm" />
        </div>
        <div>
          <Label className="text-[10px] uppercase text-muted-foreground">Type</Label>
          <Select value={line.expense_type_id || ""} disabled={readOnly} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {expenseTypes.filter((t) => t.is_active).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {expenseType?.calculation_method === "mileage" ? (
          <>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Miles</Label>
              <Input type="number" min={0} disabled={readOnly} value={line.miles ?? ""} onChange={(e) => handleNumberField("miles", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Amount (${line.rate_used || 0}/mi)</Label>
              <Input disabled value={`$${round2(line.amount).toFixed(2)}`} className="h-8 text-sm bg-background" />
            </div>
          </>
        ) : expenseType?.calculation_method === "per_diem" ? (
          <>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Days</Label>
              <Input type="number" min={0} disabled={readOnly} value={line.days ?? ""} onChange={(e) => handleNumberField("days", e.target.value)} className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Amount (${line.rate_used || 0}/day)</Label>
              <Input disabled value={`$${round2(line.amount).toFixed(2)}`} className="h-8 text-sm bg-background" />
            </div>
          </>
        ) : (
          <div className="col-span-2">
            <Label className="text-[10px] uppercase text-muted-foreground">Amount</Label>
            <Input type="number" min={0} step="0.01" disabled={readOnly} value={line.amount ?? ""} onChange={(e) => update({ amount: Number(e.target.value) || 0 })} className="h-8 text-sm" />
          </div>
        )}
      </div>

      {expenseType?.calculation_method === "mileage" && (
        <Input placeholder="Route note (optional)" disabled={readOnly} value={line.route_note || ""} onChange={(e) => update({ route_note: e.target.value })} className="h-8 text-sm" />
      )}

      <Textarea placeholder="Description" disabled={readOnly} value={line.description || ""} onChange={(e) => update({ description: e.target.value })} className="text-sm min-h-[50px]" />

      {/* Receipts (optional) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-[10px] uppercase text-muted-foreground">Receipt</Label>
          {!readOnly && (
            <label className="inline-flex items-center gap-1 text-[11px] text-primary cursor-pointer hover:underline">
              <Upload className="w-3 h-3" /> Upload
              <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadReceipt} />
            </label>
          )}
        </div>
        {(line.receipts || []).length === 0 ? (
          <p className="text-[11px] text-muted-foreground">No receipt attached.</p>
        ) : (
          <div className="space-y-1">
            {line.receipts.map((r, idx) => (
              <div key={idx} className="flex items-center gap-2 text-[11px] bg-background rounded px-2 py-1 border border-border/40">
                <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{r.file_name}</span>
                {!readOnly && <button type="button" onClick={() => removeReceipt(idx)} className="text-red-500 hover:underline">Remove</button>}
              </div>
            ))}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="button" size="sm" variant="ghost" className="h-7 text-[11px] text-red-600 gap-1" onClick={onRemove}>
            <Trash2 className="w-3 h-3" /> Remove line
          </Button>
        </div>
      )}
    </div>
  );
}