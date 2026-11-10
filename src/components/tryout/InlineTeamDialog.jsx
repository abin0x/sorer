import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TRYOUT_FORMATS } from "@/lib/tryoutDefaults";
import { toast } from "sonner";

/**
 * Creates a Team without leaving tryout setup, so an event can feed a team
 * that doesn't exist yet. Writes the same Team payload the team list uses and
 * pre-fills what the tryout already knows (age group, gender, season, branch).
 */
export default function InlineTeamDialog({ open, plan, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [gender, setGender] = useState("Boys and Girls");
  const [format, setFormat] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(plan?.age_group ? `${plan.age_group} ${plan.gender || ""}`.trim() : "");
    setAgeGroup(plan?.age_group || "");
    setGender(plan?.gender || "Boys and Girls");
    setFormat(plan?.format || "");
  }, [open, plan]);

  const branchId = (plan?.location_ids || [])[0] || "";
  const branchName = (plan?.location_names || [])[0] || "";

  const handleCreate = async () => {
    if (!name || !format) {
      toast.error("Team name and playing format are required.");
      return;
    }
    setSaving(true);
    const team = await base44.entities.Team.create({
      ...(plan?.club_id ? { club_id: plan.club_id } : {}),
      name,
      age_group: ageGroup,
      gender,
      playing_format: format,
      season: plan?.season || "",
      location_id: branchId,
      location_name: branchName,
      coach_id: "",
      coach_name: "",
      player_ids: [],
    });
    setSaving(false);
    toast.success(`${team.name} created and added to this tryout`);
    onCreated(team);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New team</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Team name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="U14 Boys Black" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Age group</Label>
              <Input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} placeholder="U14" />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boys">Boys</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Playing format</Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {TRYOUT_FORMATS.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Input value={branchName || "Club-wide"} readOnly className="text-muted-foreground" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || !name || !format}>
            {saving ? "Creating…" : "Create team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}