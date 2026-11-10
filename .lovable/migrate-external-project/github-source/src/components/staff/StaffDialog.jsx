import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const STAFF_ROLE_OPTIONS = [
  { value: "master_admin", label: "Master Admin" },
  { value: "admin", label: "Admin" },
  { value: "club_director", label: "Club Director" },
  { value: "club_admin", label: "Club Admin" },
  { value: "branch_director", label: "Branch Director" },
  { value: "branch_admin", label: "Branch Admin" },
  { value: "bookkeeper", label: "Bookkeeper" },
  { value: "project_manager", label: "Project Manager" },
  { value: "coach", label: "Coach" },
];

export default function StaffDialog({ open, onOpenChange, user, mode, onSave, busy = false }) {
  const isInvite = mode === "invite" || !user;
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    custom_role: "coach",
    branch: "",
    title: "",
    phone: "",
    address: "",
    bio: "",
  });

  useEffect(() => {
    if (open) {
      if (user) {
        setFormData({
          email: user.email || "",
          full_name: user.full_name || "",
          custom_role: user.custom_role || "coach",
          branch: user.branch || "",
          title: user.title || "",
          phone: user.phone || "",
          address: user.address || "",
          bio: user.bio || "",
        });
      } else {
        setFormData({ email: "", full_name: "", custom_role: "coach", branch: "", title: "", phone: "", address: "", bio: "" });
      }
    }
  }, [open, user]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
            {isInvite ? "Invite Staff Member" : "Edit Staff Member"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isInvite ? (
            <>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="name@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select value={formData.custom_role} onValueChange={(v) => setFormData({ ...formData, custom_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  placeholder="Full name"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={formData.custom_role} onValueChange={(v) => setFormData({ ...formData, custom_role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Input value={formData.branch} onChange={(e) => setFormData({ ...formData, branch: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Job Title</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} rows={3} className="resize-none" />
              </div>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90">
              {busy ? "Please wait…" : isInvite ? "Send Invite" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}