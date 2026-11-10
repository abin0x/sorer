import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FacilityLinkDialog({ open, onOpenChange, program, facilities = [] }) {
  const queryClient = useQueryClient();
  const [facilityId, setFacilityId] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (program) setFacilityId(program.facility_id || "");
  }, [program, open]);

  const handleSave = async () => {
    if (!program) return;
    setSaving(true);
    try {
      const facility = facilities.find((f) => f.id === facilityId);
      await base44.entities.Program.update(program.id, {
        facility_id: facilityId,
        facility_name: facility?.name || "",
      });
      queryClient.invalidateQueries({ queryKey: ["programs-for-facilities"] });
      toast.success("Program linked to facility.");
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not link program.");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assign Facility</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {program && <p className="text-sm text-muted-foreground">Link <span className="font-medium text-foreground">{program.title}</span> to a facility for utilization tracking.</p>}
          <div>
            <Label className="text-xs">Facility</Label>
            <Select value={facilityId} onValueChange={setFacilityId}>
              <SelectTrigger><SelectValue placeholder="Select a facility" /></SelectTrigger>
              <SelectContent>
                {facilities.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}{f.location_name ? ` — ${f.location_name}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={saving || !facilityId} className="bg-primary hover:bg-primary/90 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link Facility"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}