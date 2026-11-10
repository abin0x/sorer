import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, UserPlus, ShieldCheck, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLES, ROLE_LABELS } from "@/lib/rbac";

const ROLE_OPTIONS = Object.values(ROLES);

export default function UsersTab({ clubs }) {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clubFilter, setClubFilter] = useState("all");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "user", club_id: "" });

  const load = async () => {
    setLoading(true);
    try {
      const u = await base44.entities.User.list("-created_date", 500);
      setUsers(u);
    } catch (e) {
      toast({ title: "Failed to load users", description: e?.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const clubName = (id) => clubs.find((c) => c.id === id)?.name || "—";

  const filtered = users.filter((u) => {
    if (clubFilter !== "all" && u.club_id !== clubFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.custom_role?.toLowerCase().includes(q));
    }
    return true;
  });

  const updateRole = async (user, role) => {
    try {
      await base44.entities.User.update(user.id, { custom_role: role });
      toast({ title: "Role updated", description: `${user.full_name || user.email} → ${ROLE_LABELS[role] || role}` });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const updateClub = async (user, clubId) => {
    try {
      await base44.entities.User.update(user.id, { club_id: clubId || null });
      toast({ title: "Club assigned", description: `${user.full_name || user.email} → ${clubName(clubId)}` });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const toggleSuperAdmin = async (user) => {
    try {
      await base44.entities.User.update(user.id, { is_super_admin: !user.is_super_admin });
      toast({ title: `Super admin ${!user.is_super_admin ? "granted" : "revoked"}` });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err?.message, variant: "destructive" });
    }
  };

  const invite = async () => {
    try {
      if (inviteForm.club_id) {
        const { data } = await base44.functions.invoke('inviteClubMember', {
          email: inviteForm.email, role: inviteForm.role, club_id: inviteForm.club_id,
        });
        const result = data?.results?.[0];
        if (!result?.success) throw new Error(result?.error || data?.error || 'Invitation failed');
      } else {
        await base44.users.inviteUser(inviteForm.email, inviteForm.role === "master_admin" || inviteForm.role === "admin" ? "admin" : "user");
      }
      toast({ title: "Invitation sent", description: inviteForm.email });
      setShowInvite(false);
      setInviteForm({ email: "", role: "user", club_id: "" });
      load();
    } catch (err) {
      toast({ title: "Invite failed", description: err?.response?.data?.error || err?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Users ({filtered.length})</CardTitle>
          <Button size="sm" onClick={() => setShowInvite(true)} className="bg-emerald-600 hover:bg-emerald-700"><UserPlus className="w-4 h-4" />Invite</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input placeholder="Search by name, email, or role…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="w-full sm:w-56"><SelectValue placeholder="All clubs" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All clubs</SelectItem>
                {clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400 border-b">
                    <th className="py-2 font-semibold">User</th><th className="py-2 font-semibold">Role</th><th className="py-2 font-semibold">Club</th><th className="py-2 font-semibold">Super Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b hover:bg-slate-50">
                      <td className="py-3">
                        <p className="font-semibold">{u.full_name || "—"}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </td>
                      <td className="py-3">
                        <Select value={u.custom_role} onValueChange={(v) => updateRole(u, v)}>
                          <SelectTrigger className="w-36 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>)}</SelectContent>
                        </Select>
                      </td>
                      <td className="py-3">
                        <Select value={u.club_id || "none"} onValueChange={(v) => updateClub(u, v === "none" ? "" : v)}>
                          <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No club</SelectItem>
                            {clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3">
                        <Button size="sm" variant={u.is_super_admin ? "secondary" : "outline"} onClick={() => toggleSuperAdmin(u)} className={u.is_super_admin ? "text-emerald-700 border-emerald-200" : ""}>
                          {u.is_super_admin ? <><ShieldCheck className="w-3 h-3 mr-1" />Yes</> : "Grant"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowInvite(false)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Invite a new user</h3>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Role</Label>
                <Select value={inviteForm.role} onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r] || r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Club</Label>
                <Select value={inviteForm.club_id} onValueChange={(v) => setInviteForm({ ...inviteForm, club_id: v })}>
                  <SelectTrigger><SelectValue placeholder="No club" /></SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
                <Button onClick={invite} className="bg-emerald-600 hover:bg-emerald-700" disabled={!inviteForm.email}>Send Invite</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}