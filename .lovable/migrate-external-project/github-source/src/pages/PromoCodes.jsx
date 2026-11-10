import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Loader2, Pencil, Trash2, Tag } from "lucide-react";
import { format } from "date-fns";

const EMPTY = {
  code: "", description: "", discount_type: "percent", discount_value: 10,
  min_amount: 0, max_uses: 0, valid_from: "", valid_until: "", applies_to: "all", is_active: true,
};

const APPLIES_LABEL = { all: "Everything", registration: "Season Registration", tryout_event: "Tryout Event", club_event: "Club Event" };

export default function PromoCodes() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["promo-codes"],
    queryFn: () => base44.entities.PromoCode.list("-created_date", 200),
  });

  const startCreate = () => { setEditing({ ...EMPTY }); setOpen(true); };
  const startEdit = (c) => { setEditing({ ...c }); setOpen(true); };

  const save = async () => {
    if (!editing.code || !editing.discount_value) { toast({ title: "Code and discount value are required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = {
        ...editing,
        code: String(editing.code).trim().toUpperCase(),
        discount_value: Number(editing.discount_value) || 0,
        min_amount: Number(editing.min_amount) || 0,
        max_uses: Number(editing.max_uses) || 0,
      };
      if (editing.id) {
        await base44.entities.PromoCode.update(editing.id, payload);
        toast({ title: "Promo code updated" });
      } else {
        await base44.entities.PromoCode.create(payload);
        toast({ title: "Promo code created" });
      }
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
    } catch (e) {
      toast({ title: "Save failed", description: e?.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete code "${c.code}"?`)) return;
    try {
      await base44.entities.PromoCode.delete(c.id);
      qc.invalidateQueries({ queryKey: ["promo-codes"] });
    } catch (e) {
      toast({ title: "Delete failed", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Promo Codes</h1>
          <p className="text-sm text-muted-foreground">Offer discounts on registrations, tryout events, and club events.</p>
        </div>
        <Button onClick={startCreate} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1.5" /> New Code
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : codes.length === 0 ? (
        <Card className="adisal-card"><CardContent className="p-8 text-center text-sm text-muted-foreground">No promo codes yet.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {codes.map((c) => (
            <Card key={c.id} className="adisal-card">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-semibold">{c.code}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {c.discount_type === "percent" ? `${c.discount_value}% off` : `$${c.discount_value} off`}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">{APPLIES_LABEL[c.applies_to] || c.applies_to}</Badge>
                    {!c.is_active && <Badge variant="outline" className="text-[10px] text-slate-500">Inactive</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.description || "No description"} · {c.used_count || 0}{c.max_uses > 0 ? `/${c.max_uses}` : "∞"} used
                    {c.valid_until && ` · expires ${format(new Date(c.valid_until), "MMM d, yyyy")}`}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => startEdit(c)}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => remove(c)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Promo Code" : "New Promo Code"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Code *</Label>
                <Input value={editing.code} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" className="rounded-xl font-mono" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Description</Label>
                <Input value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discount Type</Label>
                <Select value={editing.discount_type} onValueChange={(v) => setEditing({ ...editing, discount_type: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{editing.discount_type === "percent" ? "Percent Off (%)" : "Amount Off ($)"}</Label>
                <Input type="number" min="0" value={editing.discount_value} onChange={(e) => setEditing({ ...editing, discount_value: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Applies To</Label>
                <Select value={editing.applies_to} onValueChange={(v) => setEditing({ ...editing, applies_to: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPLIES_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Max Uses (0 = ∞)</Label>
                <Input type="number" min="0" value={editing.max_uses} onChange={(e) => setEditing({ ...editing, max_uses: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valid From</Label>
                <Input type="date" value={editing.valid_from} onChange={(e) => setEditing({ ...editing, valid_from: e.target.value })} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valid Until</Label>
                <Input type="date" value={editing.valid_until} onChange={(e) => setEditing({ ...editing, valid_until: e.target.value })} className="rounded-xl" />
              </div>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> Active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-primary hover:bg-primary/90">
              {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
              {editing?.id ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}