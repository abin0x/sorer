import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Add / Edit dialog for Platform cards on the Platform Dashboard.
 * Club Director and Club Admin (ADMIN_ROLES) can create, edit, and delete.
 */
export default function PlatformDialog({ platform, open, onOpenChange, onSaved }) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Boys and Girls");
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (platform) {
      setName(platform.name || "");
      setGender(platform.gender || "Boys and Girls");
      setNotes(platform.notes || "");
      setIsActive(platform.is_active !== false);
    } else {
      setName("");
      setGender("Boys and Girls");
      setNotes("");
      setIsActive(true);
    }
  }, [platform, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSaved({
        name: name.trim(),
        gender,
        notes,
        is_active: isActive,
      });
      onOpenChange(false);
    } catch {
      // error handled by caller
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{platform ? "Edit Platform" : "Add Platform"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Platform Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. MLS-Next, Girls Academy" />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
                <SelectItem value="Boys">Boys</SelectItem>
                <SelectItem value="Girls">Girls</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes about this platform" />
          </div>
          <div className="flex items-center justify-between border border-border rounded-lg px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Active</p>
              <p className="text-xs text-muted-foreground">Inactive platforms are hidden from the list</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : platform ? "Save Changes" : "Create Platform"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}