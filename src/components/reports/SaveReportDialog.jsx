import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";
import { Loader2 } from "lucide-react";

const VISIBILITY_OPTIONS = [
  { value: "private", label: "Private — only me" },
  { value: "role", label: "Shared with a role" },
  { value: "club", label: "Shared with entire club" },
];

const SHAREABLE_ROLES = [
  ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN, ROLES.BRANCH_DIRECTOR,
  ROLES.BRANCH_ADMIN, ROLES.BOOKKEEPER, ROLES.COACH, ROLES.TEAM_MANAGER,
];

/**
 * Dialog for saving the current report configuration as a named, shareable report.
 * props: { open, onClose, onSaved, report, globalFilters, reportFilters, visibleColumnKeys, groupBy, sort }
 */
export default function SaveReportDialog({ open, onClose, onSaved, report, globalFilters, reportFilters, visibleColumnKeys, groupBy, sort, customConfig }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("private");
  const [sharedRole, setSharedRole] = useState(ROLES.CLUB_ADMIN);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.entities.SavedReport.create({
        club_id: user.club_id,
        name: name.trim(),
        report_id: report.id,
        report_name: report.name,
        report_category: report.category,
        config: {
          filters: globalFilters,
          reportFilters,
          columns: visibleColumnKeys,
          groupBy,
          sort,
          ...(customConfig || {}),
        },
        visibility,
        shared_role: visibility === "role" ? sharedRole : null,
        owner_id: user.id,
        owner_name: user.full_name,
        pinned: false,
      });
      toast({ title: "Report saved", description: `"${name.trim()}" is available in Saved & Scheduled.` });
      onSaved?.();
      onClose();
      setName("");
      setVisibility("private");
    } catch (err) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Save Report</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="sr-name">Report name</Label>
            <Input
              id="sr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q3 Payments — Card Only"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {VISIBILITY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {visibility === "role" && (
            <div className="space-y-1.5">
              <Label>Share with role</Label>
              <Select value={sharedRole} onValueChange={setSharedRole}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHAREABLE_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Only users with this role can open this report. Data is still scoped to each viewer's access.</p>
            </div>
          )}
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p><strong>Report:</strong> {report.name}</p>
            <p><strong>Columns:</strong> {visibleColumnKeys.length} selected</p>
            {groupBy && <p><strong>Grouped by:</strong> {groupBy}</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}