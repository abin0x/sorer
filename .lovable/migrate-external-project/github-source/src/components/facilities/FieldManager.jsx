import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Pencil, Trash2, Sun, Sunset, Grid3x3 } from "lucide-react";
import { toast } from "sonner";
import FieldDialog from "./FieldDialog";

const STATUS_COLORS = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  closed: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function FieldManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: facilities = [] } = useQuery({ queryKey: ["facilities-manage"], queryFn: () => base44.entities.Facility.list("name", 200) });
  const { data: fieldsData = [], isLoading } = useQuery({ queryKey: ["fields-manage"], queryFn: () => base44.entities.Field.list("name", 300) });

  const grouped = useMemo(() => {
    const map = new Map();
    for (const f of fieldsData) {
      const key = f.facility_name || "Unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(f);
    }
    return [...map.entries()];
  }, [fieldsData]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["fields-manage"] });

  const handleDelete = async (id) => {
    try {
      await base44.entities.Field.delete(id);
      refresh();
      toast.success("Field deleted.");
    } catch { toast.error("Could not delete field."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Manage individual fields per facility — surface, lighting, supported formats, and status.</p>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Add Field
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : fieldsData.length === 0 ? (
        <Card className="border-border rounded-xl"><CardContent className="py-12 text-center">
          <Grid3x3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No fields configured yet. Add fields to enable per-field scheduling.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-4">
          {grouped.map(([facilityName, fields]) => (
            <div key={facilityName}>
              <p className="text-xs font-bold uppercase tracking-wide text-primary mb-2">{facilityName}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {fields.map((f) => (
                  <Card key={f.id} className="border-border rounded-xl">
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-sm text-foreground truncate">{f.name}</p>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(f); setDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[f.status] || STATUS_COLORS.active}`}>{f.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{(f.surface || "grass").replace("_", " ")}</Badge>
                        <Badge variant="outline" className="text-[10px]">{f.lighted ? <><Sunset className="w-3 h-3 mr-1" />Lighted</> : <><Sun className="w-3 h-3 mr-1" />No lights</>}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{f.indoor_outdoor}</Badge>
                      </div>
                      {f.format_supported?.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {f.format_supported.map((fmt) => <span key={fmt} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{fmt}</span>)}
                        </div>
                      )}
                      {f.notes && <p className="text-xs text-muted-foreground italic truncate">{f.notes}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <FieldDialog open={dialogOpen} onOpenChange={setDialogOpen} field={editing} facilities={facilities} onSaved={refresh} />
    </div>
  );
}