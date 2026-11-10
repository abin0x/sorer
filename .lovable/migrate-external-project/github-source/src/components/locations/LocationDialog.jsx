import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const BLANK = {
  name: "", role_description: "", branch_type: "branch",
  address: "", city: "", state: "MI", zip_code: "", phone: "",
  facilities: "", notes: "",
  branch_director_email: "", branch_director_name: "",
  branch_admin_email: "", branch_admin_name: "",
};

export default function LocationDialog({ open, onOpenChange, location, onSaved }) {
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  // Fetch users to populate branch director/admin dropdowns
  const { data: users = [] } = useQuery({
    queryKey: ["branch-dialog-users"],
    queryFn: () => base44.entities.User.list("-created_date", 200),
    enabled: open,
  });

  const branchDirectors = users.filter((u) => ["branch_director", "club_director", "admin"].includes(u.custom_role));
  const branchAdmins = users.filter((u) => ["branch_admin", "branch_director", "club_admin", "admin"].includes(u.custom_role));

  useEffect(() => {
    if (location) {
      setForm({
        ...BLANK,
        ...location,
        facilities: (location.facilities || []).join(", "),
        branch_director_email: location.branch_director_email || location.location_director_email || "",
        branch_director_name: location.branch_director_name || "",
        branch_admin_email: location.branch_admin_email || location.location_admin_email || "",
        branch_admin_name: location.branch_admin_name || "",
      });
    } else {
      setForm(BLANK);
    }
  }, [location, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleDirectorSelect = (email) => {
    const u = users.find((u) => u.email === email);
    set("branch_director_email", email);
    set("branch_director_name", u?.full_name || "");
    // Also set legacy field for backward compat
    set("location_director_email", email);
  };

  const handleAdminSelect = (email) => {
    const u = users.find((u) => u.email === email);
    set("branch_admin_email", email);
    set("branch_admin_name", u?.full_name || "");
    set("location_admin_email", email);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name) { toast.error("Branch name is required."); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        facilities: form.facilities ? form.facilities.split(",").map((s) => s.trim()).filter(Boolean) : [],
      };
      if (location?.id) {
        await base44.entities.Location.update(location.id, payload);
        toast.success("Branch updated.");
      } else {
        await base44.entities.Location.create(payload);
        toast.success("Branch created.");
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error("Could not save branch.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location?.id ? "Edit Branch" : "New Branch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Novi" /></div>
          <div><Label>Strategic Role</Label><Input value={form.role_description} onChange={(e) => set("role_description", e.target.value)} placeholder="e.g. Core club Nexus / central operations" /></div>
          <div>
            <Label>Type</Label>
            <Select value={form.branch_type} onValueChange={(v) => set("branch_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nexus">Nexus</SelectItem>
                <SelectItem value="branch">Branch</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="training">Training</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch Leadership */}
          <div className="p-3 rounded-xl bg-muted/30 border border-border space-y-3">
            <p className="text-sm font-medium">Branch Leadership</p>
            <div>
              <Label>Branch Director</Label>
              <Select value={form.branch_director_email} onValueChange={handleDirectorSelect}>
                <SelectTrigger><SelectValue placeholder="Select branch director" /></SelectTrigger>
                <SelectContent>
                  {branchDirectors.map((u) => (
                    <SelectItem key={u.id} value={u.email}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Branch Admin</Label>
              <Select value={form.branch_admin_email} onValueChange={handleAdminSelect}>
                <SelectTrigger><SelectValue placeholder="Select branch admin" /></SelectTrigger>
                <SelectContent>
                  {branchAdmins.map((u) => (
                    <SelectItem key={u.id} value={u.email}>{u.full_name} ({u.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => set("state", e.target.value)} /></div>
            <div><Label>ZIP</Label><Input value={form.zip_code} onChange={(e) => set("zip_code", e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
          </div>
          <div><Label>Facilities (comma separated)</Label><Input value={form.facilities} onChange={(e) => set("facilities", e.target.value)} placeholder="e.g. Toca Wixom, Novi Athletic Facility" /></div>
          <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
          <Button type="submit" disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : location?.id ? "Save Changes" : "Create Branch"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}