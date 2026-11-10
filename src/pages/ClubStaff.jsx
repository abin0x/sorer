import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, UserPlus, Mail, Pencil, Users, ChevronDown, MapPin, UsersRound, Trash2, ShieldCheck, ShieldAlert, Clock, UserX, Upload,
} from "lucide-react";
import useCoachCompliance from "@/components/compliance/useCoachCompliance";
import StaffComplianceCell from "@/components/compliance/StaffComplianceCell";
import ComplianceCsvImportDialog from "@/components/compliance/ComplianceCsvImportDialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import StaffDialog, { STAFF_ROLE_OPTIONS } from "@/components/staff/StaffDialog";
import StaffContactDialog from "@/components/staff/StaffContactDialog";
import ResendSetupDialog from "@/components/staff/ResendSetupDialog";
import BulkStaffImportDialog from "@/components/staff/BulkStaffImportDialog";
import StaffInvitations from '@/components/staff/StaffInvitations';
import InviteLinkDialog from '@/components/staff/InviteLinkDialog';
import { ROLES } from "@/lib/rbac";
import { useTenant } from "@/lib/TenantContext";
import { toast } from "sonner";

const roleBadgeMap = {
  master_admin: { label: "Master Admin", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  admin: { label: "Admin", color: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  club_director: { label: "Club Director", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  club_admin: { label: "Club Admin", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  branch_director: { label: "Branch Director", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  branch_admin: { label: "Branch Admin", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  bookkeeper: { label: "Bookkeeper", color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300" },
  project_manager: { label: "Project Manager", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  coach: { label: "Coach", color: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300" },
  team_manager: { label: "Team Manager", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
};

const STAFF_ROLES = STAFF_ROLE_OPTIONS.map((r) => r.value);

// Roles that can see all branches
const ALL_BRANCH_ROLES = [
  ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN,
  ROLES.PLATFORM_DIRECTOR,
];

const coachRoleLabel = (role) => {
  if (role === "head_coach") return "Head Coach";
  if (role === "assistant_coach") return "Assistant Coach";
  if (role === "trainer") return "Trainer";
  if (role === "admin") return "Admin";
  if (role === "volunteer") return "Volunteer";
  return role || "Coach";
};

export default function ClubStaff() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);
  const [dialogMode, setDialogMode] = useState("invite");
  const [selectedUser, setSelectedUser] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [emailSetup, setEmailSetup] = useState(null);
  const [collapsedBranches, setCollapsedBranches] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const { effectiveClubId } = useTenant();
  const { data: comp } = useCoachCompliance(effectiveClubId);

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me().catch(() => null),
  });
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => base44.entities.User.list(),
  });
  const { data: coaches = [], isLoading: coachesLoading } = useQuery({
    queryKey: ["coaches-staff"],
    queryFn: () => base44.entities.Coach.list("-created_date", 500),
  });
  const { data: locations = [] } = useQuery({
    queryKey: ["locations-staff"],
    queryFn: () => base44.entities.Location.list("name", 100),
  });

  const currentRole = currentUser?.custom_role;
  const currentBranchId = currentUser?.branch_id || currentUser?.location_id;
  const seesAllBranches = ALL_BRANCH_ROLES.includes(currentRole);
  const isSystemOwner = currentUser?.is_super_admin === true || !!currentUser?.system_role || currentUser?.role === 'admin';
  const canManage = isSystemOwner || ['master_admin', 'admin', 'club_director', 'club_admin'].includes(currentRole);

  // Merge Coach records with User records into a unified staff list.
  // Coaches from the Coach entity are the source of truth for coach visibility.
  // Staff users (directors, admins, etc.) are added from the User entity.
  // Deduplicate by email: if a coach email matches a user email, merge the data.
  const mergedStaff = useMemo(() => {
    const staffUsers = users.filter((u) => STAFF_ROLES.includes(u.custom_role));
    const userEmailMap = {};
    staffUsers.forEach((u) => { if (u.email) userEmailMap[u.email.toLowerCase()] = u; });

    const entries = [];

    // Add all coaches from the Coach entity
    coaches.forEach((c) => {
      const matchingUser = c.email ? userEmailMap[c.email.toLowerCase()] : null;
      entries.push({
        id: matchingUser?.id || c.id,
        coach_id: c.id,
        full_name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || matchingUser?.full_name || "—",
        email: c.email || matchingUser?.email || "—",
        custom_role: matchingUser?.custom_role || "coach",
        branch_id: c.location_id || matchingUser?.branch_id || matchingUser?.location_id,
        branch: c.location_name || matchingUser?.branch || "",
        title: coachRoleLabel(c.role),
        phone: matchingUser?.phone || c.phone || "",
        has_account: !!matchingUser,
        type: "coach",
      });
    });

    // Add staff users who are NOT coaches (directors, admins, bookkeepers, etc.)
    const coachEmails = new Set(coaches.map((c) => (c.email || "").toLowerCase()).filter(Boolean));
    staffUsers.forEach((u) => {
      if (u.email && coachEmails.has(u.email.toLowerCase())) return; // already added as coach
      entries.push({
        id: u.id,
        full_name: u.full_name || "—",
        email: u.email || "—",
        custom_role: u.custom_role,
        branch_id: u.branch_id || u.location_id,
        branch: u.branch || "",
        title: u.title || "",
        phone: u.phone || "",
        has_account: true,
        type: "user",
      });
    });

    return entries;
  }, [users, coaches]);

  const visibleStaff = useMemo(() => {
    if (seesAllBranches) return mergedStaff;
    return mergedStaff.filter((s) => s.branch_id === currentBranchId);
  }, [mergedStaff, seesAllBranches, currentBranchId]);

  const filtered = useMemo(() => {
    if (!search) return visibleStaff;
    const q = search.toLowerCase();
    return visibleStaff.filter((s) =>
      (s.full_name || "").toLowerCase().includes(q) ||
      (s.email || "").toLowerCase().includes(q) ||
      (s.custom_role || "").toLowerCase().includes(q) ||
      (s.branch || "").toLowerCase().includes(q)
    );
  }, [visibleStaff, search]);

  // Group by branch
  const grouped = useMemo(() => {
    const locMap = {};
    locations.forEach((l) => { locMap[l.id] = l; });
    const groups = {};
    filtered.forEach((s) => {
      const branchId = s.branch_id || "_unassigned";
      if (!groups[branchId]) {
        groups[branchId] = {
          id: branchId,
          name: locMap[branchId]?.name || s.branch || "Unassigned",
          location: locMap[branchId],
          staff: [],
        };
      }
      groups[branchId].staff.push(s);
    });
    return Object.values(groups).sort((a, b) => {
      if (a.id === "_unassigned") return 1;
      if (b.id === "_unassigned") return -1;
      return a.name.localeCompare(b.name);
    });
  }, [filtered, locations]);

  const inviteMutation = useMutation({
    mutationFn: async ({ email, custom_role, full_name, club_id }) => {
      const res = await base44.functions.invoke("inviteClubMember", {
        invitees: [{ email, role: custom_role, full_name: full_name || "" }], club_id,
      });
      const result = res.data?.results?.[0];
      if (!result?.success) throw new Error(result?.error || res.data?.error || "Failed to create invite");
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ['staff-invitations', effectiveClubId] });
      toast.success(result.emailed ? "Invitation emailed" : "Invitation created — share the link");
      setEmailSetup(null);
      setDialogOpen(false);
      setInviteLink(result);
    },
    onError: (e) => {
      toast.error(e.response?.data?.error || e.message || 'Failed to create invitation');
    },
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

  const deleteMutation = useMutation({
    mutationFn: async (staff) => {
      // Delete the Coach record if this staff member has one
      if (staff.coach_id) {
        await base44.entities.Coach.delete(staff.coach_id).catch(() => {});
      }
      // Remove the user's club association (clear tenant fields)
      if (staff.has_account && staff.id) {
        await base44.entities.User.update(staff.id, {
          club_id: null, custom_role: null, branch: null, title: null, branch_id: null,
        });
      }
      // Delete any UserRoles grants for this user at this club
      const roles = await base44.entities.UserRoles.filter({ user_id: staff.id, club_id: effectiveClubId }).catch(() => []);
      for (const r of (roles || [])) {
        await base44.entities.UserRoles.delete(r.id).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["coaches-staff"] });
      toast.success("Staff member removed");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to remove staff member"),
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
      inviteMutation.mutate({ email: formData.email, custom_role: formData.custom_role, full_name: formData.full_name, club_id: effectiveClubId });
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

  const toggleBranch = (id) => {
    setCollapsedBranches((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading || coachesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1.5">Club Nexus</div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Club Staff</h1>
            <p className="text-muted-foreground mt-1.5">
              {seesAllBranches
                ? "All coaches and staff across every branch"
                : `Staff in your branch${currentBranchId ? "" : " (no branch assigned to you)"}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setCsvOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" /> Import Compliance CSV
            </Button>
            <Button
              variant="outline"
              onClick={() => setBulkOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" /> Bulk Add
            </Button>
            <Button
              onClick={() => { setDialogMode("invite"); setSelectedUser(null); setDialogOpen(true); }}
              className="bg-primary hover:bg-primary/90"
            >
              <UserPlus className="w-4 h-4 mr-2" /> Add Staff
            </Button>
          </div>
        </div>

        {comp?.season && (() => {
          const coachStaff = visibleStaff.filter((s) => s.type === "coach" && s.email);
          let compliant = 0, flagged = 0, missing = 0, pending = 0;
          coachStaff.forEach((s) => {
            const recs = comp.byEmail?.[s.email.toLowerCase()] || {};
            const bg = recs["background_check"];
            const ss = recs["safesport_certification"];
            const allOk = bg && ["approved", "expiring_soon"].includes(bg.status) && ss && ["approved", "expiring_soon"].includes(ss.status);
            if (allOk) compliant++;
            else if (bg?.status === "flagged" || ss?.status === "flagged") flagged++;
            else if (bg?.status === "pending" || ss?.status === "pending") pending++;
            else missing++;
          });
          const total = coachStaff.length;
          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="adisal-card"><CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-600" /></div>
                <div><p className="text-2xl font-bold">{compliant}</p><p className="text-xs text-muted-foreground">Compliant</p></div>
              </CardContent></Card>
              <Card className="adisal-card"><CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center"><Clock className="w-5 h-5 text-amber-600" /></div>
                <div><p className="text-2xl font-bold">{pending}</p><p className="text-xs text-muted-foreground">Pending Review</p></div>
              </CardContent></Card>
              <Card className="adisal-card"><CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center"><ShieldAlert className="w-5 h-5 text-orange-600" /></div>
                <div><p className="text-2xl font-bold">{flagged}</p><p className="text-xs text-muted-foreground">Flagged / Expired</p></div>
              </CardContent></Card>
              <Card className="adisal-card"><CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center"><UserX className="w-5 h-5 text-slate-500" /></div>
                <div><p className="text-2xl font-bold">{missing}</p><p className="text-xs text-muted-foreground">Missing / No Record</p></div>
              </CardContent></Card>
            </div>
          );
        })()}

        <Card className="adisal-card">
          <CardContent className="pt-6">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {canManage && <StaffInvitations clubId={effectiveClubId} systemUser={isSystemOwner} search={search} />}

        {grouped.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
            No staff found
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map((group) => {
              const coachCount = group.staff.filter((s) => s.type === "coach").length;
              const otherStaffCount = group.staff.length - coachCount;
              const collapsed = collapsedBranches[group.id];
              return (
                <Card key={group.id} className="adisal-card overflow-hidden">
                  <button
                    onClick={() => toggleBranch(group.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/40 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{group.name}</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-xs gap-1">
                            <UsersRound className="w-3 h-3" /> {coachCount} coach{coachCount !== 1 ? "es" : ""}
                          </Badge>
                          {otherStaffCount > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {otherStaffCount} staff
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
                  </button>
                  {!collapsed && (
                    <div className="border-t border-border">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-muted/30">
                              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Name</th>
                              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Email</th>
                              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Role</th>
                              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Title</th>
                              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Compliance</th>
                              <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-2.5">Phone</th>
                              <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-2.5">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.staff.map((s) => (
                              <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                                <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                                  {s.full_name}
                                  {!s.has_account && (
                                    <span className="ml-2 text-xs text-muted-foreground italic">(no account)</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-muted-foreground">{s.email}</td>
                                <td className="px-4 py-2.5">
                                  <Badge className={`text-xs ${roleBadgeMap[s.custom_role]?.color || ""}`}>
                                    {roleBadgeMap[s.custom_role]?.label || s.custom_role}
                                  </Badge>
                                </td>
                                <td className="px-4 py-2.5 text-sm text-muted-foreground">{s.title || "—"}</td>
                                <td className="px-4 py-2.5">
                                  {s.type === "coach"
                                    ? <StaffComplianceCell staff={s} comp={comp} canOverride={canManage} />
                                    : <span className="text-xs text-slate-400">—</span>}
                                </td>
                                <td className="px-4 py-2.5 text-sm text-muted-foreground">{s.phone || "—"}</td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center justify-end gap-1">
                                    {s.has_account && (
                                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setSelectedUser(s); setDialogMode("edit"); setDialogOpen(true); }}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500 hover:text-blue-700" onClick={() => { setSelectedUser(s); setContactOpen(true); }}>
                                      <Mail className="w-3.5 h-3.5" />
                                    </Button>
                                    {canManage && s.id !== currentUser?.id && (
                                      <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(s)}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <StaffDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        user={selectedUser}
        mode={dialogMode}
        onSave={handleSave}
        busy={inviteMutation.isPending || updateMutation.isPending || !!emailSetup}
      />
      <ResendSetupDialog
        open={!!emailSetup}
        onOpenChange={(open) => { if (!open) setEmailSetup(null); }}
        clubId={emailSetup?.invite.club_id}
        reason={emailSetup?.reason}
        onReady={() => inviteMutation.mutate(emailSetup.invite)}
      />
      <InviteLinkDialog invite={inviteLink} onOpenChange={(open) => { if (!open) setInviteLink(null); }} />
      <StaffContactDialog
        open={contactOpen}
        onOpenChange={setContactOpen}
        user={selectedUser}
        onSend={(payload) => contactMutation.mutate(payload)}
      />
      <ComplianceCsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} clubId={effectiveClubId} />
      <BulkStaffImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        clubId={effectiveClubId}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ["users"] });
          queryClient.invalidateQueries({ queryKey: ['staff-invitations', effectiveClubId] });
        }}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove staff member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteTarget?.full_name} from the club.
              {deleteTarget?.has_account
                ? " Their user account will remain but will no longer be associated with this club."
                : " Their coach record will be deleted."}
              {" "}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Removing…" : "Remove"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}