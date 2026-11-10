import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Users, Calendar, Mail, Phone, Shield, Plus, X, CheckCircle2, XCircle, HelpCircle, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { format, parseISO, isAfter, startOfDay, isSameDay } from "date-fns";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { ROLES } from "@/lib/rbac";
import PlatformCalendar from "@/components/platform/PlatformCalendar";
import PlatformRoster from "@/components/platform/PlatformRoster";
import PlatformAttendanceStats from "@/components/platform/PlatformAttendanceStats";
import PlatformGameDay from "@/components/platform/PlatformGameDay";
import PlatformContacts from "@/components/platform/PlatformContacts";
import PlatformDialog from "@/components/platform/PlatformDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const ADMIN_ROLES = [ROLES.MASTER_ADMIN, ROLES.ADMIN, ROLES.CLUB_DIRECTOR, ROLES.CLUB_ADMIN];
const TYPE_COLORS = {
  practice: "bg-emerald-100 text-emerald-700 border-emerald-200",
  game: "bg-blue-100 text-blue-700 border-blue-200",
  tournament: "bg-purple-100 text-purple-700 border-purple-200",
  meeting: "bg-amber-100 text-amber-700 border-amber-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function PlatformDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const platformId = searchParams.get("platform_id");
  const queryClient = useQueryClient();
  const [grantEmail, setGrantEmail] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("2026-2027");
  const [grantRole, setGrantRole] = useState("platform_director");
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState(null);
  const [deletePlatformId, setDeletePlatformId] = useState(null);

  const { data: user } = useQuery({ queryKey: ["pd-user"], queryFn: () => base44.auth.me() });
  const { data: platforms = [] } = useQuery({ queryKey: ["pd-platforms"], queryFn: () => base44.entities.Platform.list("name", 100) });
  const { data: teams = [] } = useQuery({ queryKey: ["pd-teams"], queryFn: () => base44.entities.Team.list("name", 300) });
  const { data: players = [] } = useQuery({ queryKey: ["pd-players"], queryFn: () => base44.entities.Player.list("-created_date", 500) });
  const { data: coaches = [] } = useQuery({ queryKey: ["pd-coaches"], queryFn: () => base44.entities.Coach.list("last_name", 200) });
  const { data: guardians = [] } = useQuery({ queryKey: ["pd-guardians"], queryFn: () => base44.entities.Guardian.list("-created_date", 500) });
  const { data: events = [] } = useQuery({ queryKey: ["pd-events"], queryFn: () => base44.entities.CalendarEvent.list("start_datetime", 500) });
  const { data: accessList = [] } = useQuery({ queryKey: ["pd-access"], queryFn: () => base44.entities.PlatformAccess.list("-granted_date", 200) });
  const { data: users = [] } = useQuery({ queryKey: ["pd-users"], queryFn: () => base44.entities.User.list("-created_date", 200) });

  const isAdmin = user && ADMIN_ROLES.includes(user.custom_role);
  const platform = platforms.find((p) => p.id === platformId);

  // If no platform selected, show platform list
  const handleSavePlatform = async (data) => {
    try {
      if (editingPlatform) {
        await base44.entities.Platform.update(editingPlatform.id, data);
        toast.success("Platform updated");
      } else {
        await base44.entities.Platform.create(data);
        toast.success("Platform created");
      }
      queryClient.invalidateQueries({ queryKey: ["pd-platforms"] });
      setEditingPlatform(null);
    } catch (e) {
      toast.error("Failed to save platform: " + e.message);
      throw e;
    }
  };

  const handleDeletePlatform = async () => {
    try {
      await base44.entities.Platform.delete(deletePlatformId);
      queryClient.invalidateQueries({ queryKey: ["pd-platforms"] });
      toast.success("Platform deleted");
      setDeletePlatformId(null);
    } catch (e) {
      toast.error("Failed to delete platform");
    }
  };

  if (!platformId) {
    return (
      <div className="p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-bold tracking-wider uppercase text-primary mb-1">Club Nexus</div>
            <h1 className="text-2xl font-extrabold text-foreground">Platform Dashboards</h1>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditingPlatform(null); setPlatformDialogOpen(true); }} className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-1" /> Add Platform
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.filter(p => p.is_active !== false).map((p) => {
            const teamCount = teams.filter((t) => t.platform_id === p.id).length;
            const hasAccess = isAdmin || accessList.some((a) => a.platform_id === p.id && a.user_id === user?.id);
            return (
              <Card key={p.id} className={`cursor-pointer hover:border-primary/40 transition-colors ${hasAccess ? "" : "opacity-60"}`} >
                <CardContent className="p-5" onClick={() => hasAccess ? setSearchParams({ platform_id: p.id }) : toast.error("You don't have access to this platform")}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Trophy className="w-5 h-5 text-primary" /></div>
                    <div className="flex-1"><div className="flex items-center gap-1"><p className="font-bold text-foreground">{p.name}</p>{p.gender && <Badge variant="outline" className="text-[9px]">{p.gender}</Badge>}</div><p className="text-xs text-muted-foreground">{teamCount} teams</p></div>
                    {isAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingPlatform(p); setPlatformDialogOpen(true); }}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:bg-red-50" onClick={() => setDeletePlatformId(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    )}
                  </div>
                  {p.notes && <p className="text-xs text-muted-foreground line-clamp-2">{p.notes}</p>}
                  {!hasAccess && <Badge variant="outline" className="text-[10px] mt-2"><Shield className="w-2.5 h-2.5 mr-1" /> No Access</Badge>}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <PlatformDialog platform={editingPlatform} open={platformDialogOpen} onOpenChange={setPlatformDialogOpen} onSaved={handleSavePlatform} />
        <AlertDialog open={!!deletePlatformId} onOpenChange={(o) => !o && setDeletePlatformId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this platform?</AlertDialogTitle>
              <AlertDialogDescription>This will remove the platform card. Teams assigned to it will keep their platform_id but the card will no longer appear.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeletePlatform}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  if (!platform) return <div className="p-8 text-center text-muted-foreground">Platform not found.</div>;

  // Check access
  const hasAccess = isAdmin || accessList.some((a) => a.platform_id === platformId && a.user_id === user?.id);
  if (!hasAccess) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">You don't have access to this platform dashboard. Ask an admin to grant you access.</p>
        <Button asChild variant="outline" className="mt-4"><Link to={createPageUrl("PlatformDashboard")}>Back to Platforms</Link></Button>
      </div>
    );
  }

  const platformTeams = teams.filter((t) => t.platform_id === platformId);
  const platformTeamIds = new Set(platformTeams.map((t) => t.id));
  const platformPlayerIds = [...new Set(platformTeams.flatMap((t) => t.player_ids || []))];
  const platformPlayers = players.filter((p) => platformPlayerIds.includes(p.id));
  const platformEvents = events.filter((e) => (e.team_ids || []).some((id) => platformTeamIds.has(id)));
  const seasons = [...new Set(players.map(p => p.season).filter(Boolean))].sort().reverse();
  const seasonTeams = platformTeams.filter((t) => !t.season || t.season === selectedSeason);
  const seasonTeamIds = new Set(seasonTeams.map(t => t.id));
  const seasonPlayerIds = [...new Set(seasonTeams.flatMap(t => t.player_ids || []))];
  const seasonPlayers = platformPlayers.filter((p) => seasonPlayerIds.includes(p.id));
  const seasonEvents = platformEvents.filter((e) => !e.season || e.season === selectedSeason);
  const today = startOfDay(new Date());
  const upcomingEvents = platformEvents
    .filter((e) => e.start_datetime && (isAfter(parseISO(e.start_datetime), today) || isSameDay(parseISO(e.start_datetime), today)))
    .sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime))
    .slice(0, 8);
  const platformCoaches = coaches.filter((c) => platformTeams.some((t) => t.coach_id === c.id));
  const platformAccess = accessList.filter((a) => a.platform_id === platformId);

  const handleGrant = async () => {
    const grantee = users.find((u) => u.email?.toLowerCase() === grantEmail.toLowerCase().trim());
    if (!grantee) { toast.error("User not found. They must be a registered app user."); return; }
    try {
      await base44.entities.PlatformAccess.create({
        user_id: grantee.id, user_email: grantee.email, user_name: grantee.full_name,
        user_role: grantee.custom_role || grantRole, platform_id: platformId, platform_name: platform.name,
        granted_by: user.email, granted_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["pd-access"] });
      setGrantEmail("");
      toast.success(`Access granted to ${grantee.full_name}`);
    } catch (e) { toast.error("Failed to grant access: " + e.message); }
  };

  const handleRevoke = async (accessId) => {
    try {
      await base44.entities.PlatformAccess.delete(accessId);
      queryClient.invalidateQueries({ queryKey: ["pd-access"] });
      toast.success("Access revoked");
    } catch (e) { toast.error("Failed to revoke access"); }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to={createPageUrl("PlatformDashboard")} className="text-xs text-muted-foreground hover:text-foreground">← All Platforms</Link>
          <h1 className="text-2xl font-extrabold text-foreground mt-1 flex items-center gap-2"><Trophy className="w-6 h-6 text-primary" /> {platform.name}</h1>
          {platform.notes && <p className="text-sm text-muted-foreground mt-1">{platform.notes}</p>}
        </div>
        {seasons.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Season:</span>
            <Select value={selectedSeason} onValueChange={setSelectedSeason}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                {seasons.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Trophy className="w-3.5 h-3.5" /> Teams</div><p className="text-2xl font-bold mt-1">{seasonTeams.length}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" /> Players</div><p className="text-2xl font-bold mt-1">{seasonPlayers.length}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" /> Events</div><p className="text-2xl font-bold mt-1">{seasonEvents.length}</p></Card>
        <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Shield className="w-3.5 h-3.5" /> Coaches</div><p className="text-2xl font-bold mt-1">{platformCoaches.length}</p></Card>
      </div>

      {/* Access Management (admin only) */}
      {isAdmin && (
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> Access Management</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <input type="email" placeholder="user@email.com" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} className="flex-1 min-w-48 h-8 rounded-lg border border-border px-3 text-sm" />
              <Select value={grantRole} onValueChange={setGrantRole}>
                <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="platform_director">Platform Director</SelectItem>
                  <SelectItem value="coach">Coach (View Only)</SelectItem>
                  <SelectItem value="branch_director">Branch Director</SelectItem>
                  <SelectItem value="club_director">Club Director</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleGrant} className="bg-primary hover:bg-primary/90"><Plus className="w-3.5 h-3.5 mr-1" /> Grant Access</Button>
            </div>
            {platformAccess.length > 0 && (
              <div className="space-y-1.5">
                {platformAccess.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40">
                    <div className="flex-1"><p className="text-sm font-medium">{a.user_name}</p><p className="text-[10px] text-muted-foreground">{a.user_email} · {a.user_role}</p></div>
                    <Button size="sm" variant="ghost" onClick={() => handleRevoke(a.id)} className="h-7 text-xs text-red-600 hover:bg-red-50"><X className="w-3 h-3" /> Revoke</Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar — prominent, full width */}
      <PlatformCalendar events={seasonEvents} teams={seasonTeams} players={seasonPlayers} guardians={guardians} />

      {/* Attendance Analytics */}
      <PlatformAttendanceStats platformName={platform.name} teams={seasonTeams} players={seasonPlayers} events={seasonEvents} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Game Day */}
        <PlatformGameDay events={seasonEvents} teams={seasonTeams} players={seasonPlayers} />

        {/* Teams */}
        <Card className="border-border/60">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Teams</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
            {seasonTeams.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No teams assigned to this platform yet.</p> : seasonTeams.map((t) => (
              <Link key={t.id} to={`${createPageUrl("TeamDetail")}?id=${t.id}`} className="block p-2.5 rounded-lg bg-muted/40 border border-border/40 hover:border-primary/30 transition-colors">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.age_group || "—"} · {t.gender} · {t.coach_name || "No coach"} · {t.player_ids?.length || 0} players</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Roster */}
      <PlatformRoster teams={seasonTeams} players={seasonPlayers} events={seasonEvents} />

      {/* Contacts */}
      <PlatformContacts players={seasonPlayers} guardians={guardians} teams={seasonTeams} />
    </div>
  );
}