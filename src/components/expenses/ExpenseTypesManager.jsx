import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Lock } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useTenant } from "@/lib/TenantContext";
import { hasPermission } from "@/lib/rbac";
import { DEFAULT_EXPENSE_TYPES } from "@/lib/expenseHelpers";

const BLANK = { name: "", calculation_method: "flat", rate: 0, quickbooks_account: "", receipt_required: true, receipt_threshold: 0, is_active: true };

export default function ExpenseTypesManager({ user }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id || user?.club_id;
  const canEdit = hasPermission(user, "finance:approve");
  const [draft, setDraft] = useState(BLANK);

  const { data: types = [] } = useQuery({
    queryKey: ["expense-types", clubId],
    queryFn: () => base44.entities.ExpenseType.filter({ club_id: clubId }, "name"),
    enabled: !!clubId,
  });

  const seedDefaults = async () => {
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.ExpenseType.bulkCreate(
      DEFAULT_EXPENSE_TYPES.map((t) => ({ ...t, club_id: clubId, rate_effective_date: today, is_active: true }))
    );
    queryClient.invalidateQueries({ queryKey: ["expense-types", clubId] });
    toast({ title: "Default expense types added" });
  };

  const addType = async () => {
    if (!draft.name.trim()) return;
    await base44.entities.ExpenseType.create({ ...draft, club_id: clubId, rate_effective_date: new Date().toISOString().split("T")[0] });
    setDraft(BLANK);
    queryClient.invalidateQueries({ queryKey: ["expense-types", clubId] });
    toast({ title: "Expense type added" });
  };

  const updateType = async (id, patch) => {
    await base44.entities.ExpenseType.update(id, patch);
    queryClient.invalidateQueries({ queryKey: ["expense-types", clubId] });
  };

  const removeType = async (id) => {
    await base44.entities.ExpenseType.delete(id);
    queryClient.invalidateQueries({ queryKey: ["expense-types", clubId] });
  };

  return (
    <Card className="border-border/60 rounded-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold">Expense Types</CardTitle>
            <p className="text-xs text-muted-foreground">Only bookkeepers and club admins can add or edit types.</p>
          </div>
          {types.length === 0 && canEdit && (
            <Button size="sm" variant="outline" className="h-7 gap-1" onClick={seedDefaults}>
              <Plus className="w-3.5 h-3.5" /> Add defaults
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-2 flex-wrap p-2 rounded-lg border border-border/40 bg-muted/20 text-sm">
            <span className="font-medium flex-1 min-w-[120px]">{t.name}</span>
            <span className="text-xs text-muted-foreground capitalize">{t.calculation_method}</span>
            {t.calculation_method !== "flat" && <span className="text-xs text-muted-foreground">${t.rate}/{t.calculation_method === "mileage" ? "mi" : "day"}</span>}
            <div className="flex items-center gap-1.5">
              <Switch checked={t.is_active} disabled={!canEdit} onCheckedChange={(v) => updateType(t.id, { is_active: v })} />
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            {canEdit && (
              <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => removeType(t.id)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        ))}

        {canEdit ? (
          <div className="grid sm:grid-cols-5 gap-2 items-end pt-2 border-t border-border/60">
            <div className="sm:col-span-2">
              <Label className="text-[10px] uppercase text-muted-foreground">Name</Label>
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Hotel, Other…" className="h-8 text-sm" />
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Calculation</Label>
              <Select value={draft.calculation_method} onValueChange={(v) => setDraft({ ...draft, calculation_method: v })}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">Flat amount</SelectItem>
                  <SelectItem value="mileage">Mileage</SelectItem>
                  <SelectItem value="per_diem">Per diem</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {draft.calculation_method !== "flat" && (
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Rate</Label>
                <Input type="number" step="0.01" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: Number(e.target.value) || 0 })} className="h-8 text-sm" />
              </div>
            )}
            <Button size="sm" className="h-8 gap-1" onClick={addType}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
            <Lock className="w-3.5 h-3.5" /> Only bookkeepers and club admins can add or edit expense types.
          </div>
        )}
      </CardContent>
    </Card>
  );
}