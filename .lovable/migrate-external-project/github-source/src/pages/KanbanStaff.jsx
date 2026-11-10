import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, Users } from "lucide-react";
import StaffCard from "@/components/staff/StaffCard";
import StaffDialog, { STAFF_ROLE_OPTIONS } from "@/components/staff/StaffDialog";
import StaffContactDialog from "@/components/staff/StaffContactDialog";
import { toast } from "sonner";

const STAFF_ROLES = STAFF_ROLE_OPTIONS.map((r) => r.value);

export default function KanbanStaff() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("invite");
  const [selectedUser, setSelectedUser] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });

  const staff = users.filter((u) => STAFF_ROLES.includes(u.custom_role));
  const filtered = staff.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.custom_role || "").toLowerCase().includes(q) ||
      (u.branch || "").toLowerCase().includes(q)
    );
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, custom_role }) => base44.users.inviteUser(email, custom_role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Invitation sent");
      setDialogOpen(false);
    },
    onError: (e) => toast.error("Failed to invite: " + (e?.message || "Unknown error")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Staff updated");
      setDialogOpen(false);
    },
    onError: () => toast.error("Failed to update staff"),
  });

  const contactMutation = useMutation({
    mutationFn: ({ to, subject, body }) => base44.integrations.Core.SendEmail({ to, subject, body }),
    onSuccess: () => {
      toast.success("Message sent");
      setContactOpen(false);
    },
    onError: () => toast.error("Failed to send message"),
  });

  const handleSave = (formData) => {
    if (dialogMode === "invite") {
      inviteMutation.mutate({ email: formData.email, custom_role: formData.custom_role });
    } else if (selectedUser) {
      updateMutation.mutate({
        id: selectedUser.id,
        data: {
          custom_role: formData.custom_role,
          branch: formData.branch,
          title: formData.title,
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio,
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Kanban</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Staff Cards</h1>
            <p className="text-muted-foreground mt-1.5">Card-based view of club staff and their assignments</p>
          </div>
          <Button
            onClick={() => { setDialogMode("invite"); setSelectedUser(null); setDialogOpen(true); }}
            className="bg-primary hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4 mr-2" /> Add Staff
          </Button>
        </div>

        <Card className="adisal-card">
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="dark:bg-slate-900 dark:border-slate-800">
            <CardContent className="pt-10 pb-10 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No staff found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((user) => (
              <StaffCard
                key={user.id}
                user={user}
                onEdit={(u) => { setSelectedUser(u); setDialogMode("edit"); setDialogOpen(true); }}
                onContact={(u) => { setSelectedUser(u); setContactOpen(true); }}
              />
            ))}
          </div>
        )}
      </div>

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        mode={dialogMode}
        onSave={handleSave}
      />
      <StaffContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        user={selectedUser}
        onSend={(payload) => contactMutation.mutate(payload)}
      />
    </div>
  );
}