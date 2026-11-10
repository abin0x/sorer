import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

// Generic admin CRUD list for simple lookup entities (name + optional secondary field + optional select field).
export default function SimpleListManager({ entityName, title, icon: Icon, secondaryField, secondaryLabel, secondaryPlaceholder, selectField, selectOptions, selectLabel }) {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newSecondary, setNewSecondary] = useState("");
  const [newSelect, setNewSelect] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", secondary: "", select: "" });

  const queryKey = [`${entityName}-list`];
  const { data: items = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities[entityName].list("name", 200),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const handleAdd = async () => {
    if (!newName.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      const payload = { name: newName.trim() };
      if (secondaryField) payload[secondaryField] = newSecondary.trim();
      if (selectField) payload[selectField] = newSelect || undefined;
      await base44.entities[entityName].create(payload);
      setNewName(""); setNewSecondary(""); setNewSelect("");
      invalidate();
      toast.success(`${title.replace(/s$/, "")} added.`);
    } catch (e) {
      toast.error("Could not add item.");
    } finally { setSaving(false); }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ name: item.name || "", secondary: secondaryField ? item[secondaryField] || "" : "", select: selectField ? item[selectField] || "" : "" });
  };

  const saveEdit = async (id) => {
    try {
      const payload = { name: editForm.name };
      if (secondaryField) payload[secondaryField] = editForm.secondary;
      if (selectField) payload[selectField] = editForm.select || undefined;
      await base44.entities[entityName].update(id, payload);
      setEditingId(null);
      invalidate();
      toast.success("Updated.");
    } catch (e) {
      toast.error("Could not update item.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities[entityName].delete(id);
      invalidate();
      toast.success("Deleted.");
    } catch (e) {
      toast.error("Could not delete item.");
    }
  };

  const getSelectLabel = (value) => selectOptions?.find(o => o.value === value)?.label || value;

  return (
    <Card className="border-border rounded-xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[#0B162B]">
          {Icon && <Icon className="w-4 h-4 text-[#399F7D]" />} {title} <Badge variant="outline" className="ml-1 text-[10px]">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={`New ${title.toLowerCase().replace(/s$/, "")} name`} className="flex-1 min-w-[160px]" />
          {secondaryField && (
            <Input value={newSecondary} onChange={(e) => setNewSecondary(e.target.value)} placeholder={secondaryPlaceholder || secondaryLabel} className="flex-1 min-w-[160px]" />
          )}
          {selectField && (
            <Select value={newSelect} onValueChange={setNewSelect}>
              <SelectTrigger className="w-40"><SelectValue placeholder={selectLabel || selectField} /></SelectTrigger>
              <SelectContent>
                {selectOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button onClick={handleAdd} disabled={saving} size="sm" className="bg-[#399F7D] hover:bg-[#399F7D]/90 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1" /> Add</>}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No {title.toLowerCase()} yet.</p>
        ) : (
          <div className="divide-y divide-border max-h-80 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 py-2">
                {editingId === item.id ? (
                  <>
                    <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} className="flex-1 h-8" />
                    {secondaryField && (
                      <Input value={editForm.secondary} onChange={(e) => setEditForm((f) => ({ ...f, secondary: e.target.value }))} className="flex-1 h-8" />
                    )}
                    {selectField && (
                      <Select value={editForm.select} onValueChange={(v) => setEditForm((f) => ({ ...f, select: v }))}>
                        <SelectTrigger className="w-36 h-8"><SelectValue placeholder={selectLabel || selectField} /></SelectTrigger>
                        <SelectContent>
                          {selectOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveEdit(item.id)}><Check className="w-3.5 h-3.5 text-emerald-600" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="w-3.5 h-3.5" /></Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0B162B] truncate">{item.name}</p>
                      {secondaryField && item[secondaryField] && <p className="text-xs text-muted-foreground truncate">{item[secondaryField]}</p>}
                    </div>
                    {selectField && item[selectField] && <Badge variant="outline" className="text-[10px]">{getSelectLabel(item[selectField])}</Badge>}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(item)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}