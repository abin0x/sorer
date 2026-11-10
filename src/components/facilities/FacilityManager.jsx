import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Pencil, MapPin, Grid3x3, Clock, Phone } from "lucide-react";
import { toast } from "sonner";
import FacilityDialogEnhanced from "@/components/facilities/FacilityDialogEnhanced";

const DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" }, { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" }, { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" }, { key: "sun", label: "Sun" },
];

export default function FacilityManager() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: facilities = [], isLoading } = useQuery({
    queryKey: ["facilities-manage"],
    queryFn: () => base44.entities.Facility.list("name", 200),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-for-facility"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });

  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (f) => { setEditing(f); setDialogOpen(true); };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["facilities-manage"] });
    queryClient.invalidateQueries({ queryKey: ["facilities-utilization"] });
    queryClient.invalidateQueries({ queryKey: ["fields"] });
    queryClient.invalidateQueries({ queryKey: ["fields-manage"] });
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.Facility.delete(id);
      handleSaved();
      toast.success("Facility deleted.");
    } catch (e) { toast.error("Could not delete facility."); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Track site availability, capacity, and surface type for each facility.</p>
        <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 text-white rounded-lg">
          <Plus className="w-4 h-4 mr-2" /> Add Facility
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : facilities.length === 0 ? (
        <Card className="border-border rounded-xl"><CardContent className="py-12 text-center">
          <MapPin className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No facilities configured yet.</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {facilities.map((f) => (
            <Card key={f.id} className="border-border rounded-xl">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{f.name}</p>
                    {f.branch_names?.length ? (
                      <p className="text-xs text-muted-foreground truncate">{f.branch_names.join(", ")}</p>
                    ) : f.location_name ? (
                      <p className="text-xs text-muted-foreground truncate">{f.location_name}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(f)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600" onClick={() => handleDelete(f.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {f.address && <p className="text-xs text-muted-foreground flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{f.address}</p>}
                {f.phone && <p className="text-xs text-muted-foreground flex items-start gap-1"><Phone className="w-3 h-3 mt-0.5 shrink-0" />{f.phone}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{f.surface_type || "grass"}</Badge>
                  <Badge variant="outline" className="text-[10px]"><Grid3x3 className="w-3 h-3 mr-1" />{f.field_count || 1} field{(f.field_count || 1) > 1 ? "s" : ""}</Badge>
                  {f.operating_hours && <Badge variant="outline" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />{f.operating_hours}</Badge>}
                </div>
                {f.available_days?.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {DAYS.map((d) => (
                      <span key={d.key} className={`text-[9px] px-1.5 py-0.5 rounded ${f.available_days.includes(d.key) ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground/40"}`}>
                        {d.label}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <FacilityDialogEnhanced
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        facility={editing}
        locations={locations}
        onSaved={handleSaved}
      />
    </div>
  );
}