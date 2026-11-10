import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function RoadmapProjectDialog({ open, onOpenChange, project, onSaved }) {
  const [formData, setFormData] = useState({
    number: "",
    title: "",
    description: "",
    is_active: true,
    order: 0,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        number: project.number || "",
        title: project.title || "",
        description: project.description || "",
        is_active: project.is_active !== false,
        order: project.order || 0,
      });
    } else {
      setFormData({ number: "", title: "", description: "", is_active: true, order: 0 });
    }
  }, [project, open]);

  const handleSave = async () => {
    if (!formData.number || !formData.title) {
      toast.error("Project number and title are required");
      return;
    }
    setSaving(true);
    try {
      if (project) {
        await base44.entities.RoadmapProject.update(project.id, formData);
        toast.success("Project updated");
      } else {
        await base44.entities.RoadmapProject.create(formData);
        toast.success("Project added");
      }
      onOpenChange(false);
      if (onSaved) onSaved();
    } catch (e) {
      toast.error("Could not save project: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add Project"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Project #</Label>
              <Input value={formData.number} onChange={(e) => setFormData({ ...formData, number: e.target.value })} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Order</Label>
              <Input type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Discovery & Process Design" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="min-h-[60px]" />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
            <Label className="text-sm">Active on roadmap</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {saving ? "Saving…" : "Save Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}