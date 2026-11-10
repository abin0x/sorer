import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ArrowLeft, Save, CalendarCheck, Users, DollarSign, UserCog, Share2, Plus,
  Trophy, MapPin, Briefcase, Activity, ClipboardCheck, Star,
  IdCard, Target, TrendingUp, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import ContactActions from "@/components/shared/ContactActions";
import TryoutDialog from "@/components/tryout/TryoutDialog";
import ShareTryoutDialog from "@/components/tryout/ShareTryoutDialog";
import TeamSchedulePanel from "@/components/team/TeamSchedulePanel";
import { MultiAssignSelect } from "@/components/admin/MultiAssignSelect";
import useCoachCompliance from "@/components/compliance/useCoachCompliance";
import SubPageLayout from "@/components/layout/SubPageLayout";
import CoachComplianceBadge from "@/components/compliance/CoachComplianceBadge";
import { useTenant } from "@/lib/TenantContext";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900 dark:text-amber-300",
  waitlist: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900 dark:text-blue-300",
  inactive: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400",
};

export default function TeamDetail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const teamId = searchParams.get("id");
  const queryClient = useQueryClient();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tryoutOpen, setTryoutOpen] = useState(false);
  const [shareTryout, setShareTryout] = useState(null);

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", teamId],
    queryFn: () => base44.entities.Team.get(teamId),
    enabled: !!teamId,
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["coaches-for-team-detail"],
    queryFn: () => base44.entities.Coach.list("last_name", 200),
  });
  const { data: guardians = [] } = useQuery({
    queryKey: ["guardians-for-team-detail"],
    queryFn: () => base44.entities.Guardian.list("last_name", 200),
  });
  const { data: tryouts = [] } = useQuery({
    queryKey: ["tryouts-for-team", teamId],
    queryFn: () => base44.entities.TryoutEvent.filter({ team_id: teamId }, "-event_date", 50),
    enabled: !!teamId,
  });
  const { data: players = [] } = useQuery({
    queryKey: ["players-for-team", teamId],
    queryFn: () => base44.entities.Player.filter({ team_id: teamId }, "last_name", 100),
    enabled: !!teamId,
  });
  const { data: registrations = [] } = useQuery({
    queryKey: ["regs-for-team-players", teamId],
    queryFn: () => base44.entities.Registration.list("-created_date", 500),
  });
  const { data: program } = useQuery({
    queryKey: ["program-for-team", team?.program_id],
    queryFn: () => team?.program_id ? base44.entities.Program.get(team.program_id) : null,
    enabled: !!team?.program_id,
  });
  const { effectiveClubId } = useTenant();
  const { data: comp } = useCoachCompliance(effectiveClubId);

  useEffect(() => { if (team) setForm({ ...team }); }, [team]);

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading team…</div>;
  if (!team) return <div className="p-8 text-center text-muted-foreground">Team not found.</div>;
  if (!form) return null;

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const coachOptions = coaches.map((c) => ({ value: c.id, label: `${c.first_name} ${c.last_name}${c.role ? ` — ${c.role.replace(/_/g, " ")}` : ""}` }));
  const guardianOptions = guardians.map((g) => ({ value: g.id, label: `${g.first_name} ${g.last_name}` }));

  const handleCoachIdsChange = (ids) => {
    const selected = coaches.filter((c) => ids.includes(c.id));
    setForm((f) => ({
      ...f,
      coach_ids: ids,
      coach_names: selected.map((c) => `${c.first_name} ${c.last_name}`),
      coach_id: ids[0] || "",
      coach_name: selected[0] ? `${selected[0].first_name} ${selected[0].last_name}` : "",
    }));
  };
  const handleManagerIdsChange = (ids) => {
    const selected = guardians.filter((g) => ids.includes(g.id));
    setForm((f) => ({
      ...f,
      team_manager_ids: ids,
      team_manager_names: selected.map((g) => `${g.first_name} ${g.last_name}`),
      team_manager_id: ids[0] || "",
      team_manager_name: selected[0] ? `${selected[0].first_name} ${selected[0].last_name}` : "",
    }));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Team.update(teamId, {
        name: form.name, age_group: form.age_group, gender: form.gender, season: form.season,
        league: form.league, team_plans: form.team_plans, cost: form.cost ? Number(form.cost) : undefined,
        coach_id: form.coach_id, coach_name: form.coach_name,
        coach_ids: form.coach_ids || [], coach_names: form.coach_names || [],
        team_manager_id: form.team_manager_id, team_manager_name: form.team_manager_name,
        team_manager_ids: form.team_manager_ids || [], team_manager_names: form.team_manager_names || [],
        max_roster_size: form.max_roster_size ? Number(form.max_roster_size) : undefined, notes: form.notes,
      });
      queryClient.invalidateQueries({ queryKey: ["team", teamId] });
      queryClient.invalidateQueries({ queryKey: ["dash-teams"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team saved");
    } catch (e) { toast.error("Save failed: " + e.message); }
    finally { setSaving(false); }
  };

  const rosterPct = team.max_roster_size ? Math.round((players.length / team.max_roster_size) * 100) : 0;
  const delinquentCount = players.filter((p) => {
    const r = registrations.find(r => r.player_id === p.id);
    return r && (r.amount_due || 0) - (r.amount_paid || 0) > 0;
  }).length;
  const genderCounts = players.reduce((acc, p) => {
    if (p.gender) acc[p.gender] = (acc[p.gender] || 0) + 1;
    return acc;
  }, {});
  const upcomingTryouts = tryouts.filter((t) => t.status === "scheduled" && new Date(t.event_date) >= new Date());
  const totalRevenue = players.length * (team.cost || 0);

  return (
    <SubPageLayout
      title={team.name}
      subtitle={team.age_group ? `${team.age_group} team` : "Team"}
      backTo="/Registration?tab=teams"
      contentClassName="space-y-6 max-w-7xl mx-auto"
    >

      {/* ===== Profile Header ===== */}
      <Card className="adisal-card overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
            <div className="lg:col-span-2 p-5 lg:p-6 flex items-start gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center shrink-0">
                <Trophy className="w-9 h-9 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{team.name}</h1>
                  <Badge variant="outline" className="text-xs">{team.age_group || "—"}</Badge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                  {team.gender && <span>{team.gender}</span>}
                  {team.season && <span className="flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" /> {team.season}</span>}
                  {team.league && <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {team.league}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-3 items-center">
                  {team.coach_name && <Badge variant="secondary" className="text-xs"><UserCog className="w-3 h-3 mr-1" /> {team.coach_name}</Badge>}
                  {team.location_name && <Badge variant="outline" className="text-xs"><MapPin className="w-3 h-3 mr-1" /> {team.location_name}</Badge>}
                  {program && <Badge variant="outline" className="text-xs"><Briefcase className="w-3 h-3 mr-1" /> {program.title}</Badge>}
                  {(() => {
                    const assignedCoaches = coaches.filter(c => (team.coach_ids || (team.coach_id ? [team.coach_id] : [])).includes(c.id));
                    return assignedCoaches.length > 0 && (
                      <ContactActions
                        email={assignedCoaches[0]?.email}
                        phone={assignedCoaches[0]?.phone}
                        onMessage={() => {
                          const c = assignedCoaches[0];
                          if (!c?.email) return;
                          const p = new URLSearchParams({ recipient_email: c.email });
                          const name = [c.first_name, c.last_name].filter(Boolean).join(" ");
                          if (name) p.set("recipient_name", name);
                          navigate(`/CommunicationPortal?${p.toString()}`);
                        }}
                      />
                    );
                  })()}
                </div>
              </div>
            </div>
            <div className="surface-tile p-5 lg:p-6 border-t lg:border-t-0 lg:border-l border-border">
              <p className="section-title mb-2">Roster Status</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{players.length}</span>
                <span className="text-sm text-muted-foreground">/ {team.max_roster_size || 18} players</span>
              </div>
              <Progress value={rosterPct} className="h-2 mt-2" />
              <p className="text-xs text-muted-foreground mt-1">{rosterPct}% capacity</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap px-5 lg:px-6 py-3 border-t border-border bg-muted/30">
            <Button onClick={handleSave} disabled={saving} size="sm" className="bg-primary hover:bg-primary/90"><Save className="w-3.5 h-3.5 mr-1.5" /> {saving ? "Saving…" : "Save Changes"}</Button>
            <Button size="sm" variant="outline" onClick={() => setTryoutOpen(true)}><Plus className="w-3.5 h-3.5 mr-1.5" /> Schedule Tryout</Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Schedule & Attendance ===== */}
      <TeamSchedulePanel teamId={teamId} team={team} />

      {/* ===== CLUSTER 1: Admin Info ===== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="section-title">Admin Info</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Team Information — spans 2 */}
          <Card className="adisal-card lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><IdCard className="w-4 h-4" /> Team Information</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Team Name</Label><Input value={form.name || ""} onChange={(e) => handleChange("name", e.target.value)} className="rounded-xl" /></div>
                <div><Label className="text-xs">Age Group</Label><Input value={form.age_group || ""} onChange={(e) => handleChange("age_group", e.target.value)} className="rounded-xl" placeholder="U14" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => handleChange("gender", v)}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boys">Boys</SelectItem>
                      <SelectItem value="Girls">Girls</SelectItem>
                      <SelectItem value="Boys and Girls">Boys and Girls</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Season</Label><Input value={form.season || ""} onChange={(e) => handleChange("season", e.target.value)} className="rounded-xl" placeholder="2026-2027" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">League</Label><Input value={form.league || ""} onChange={(e) => handleChange("league", e.target.value)} className="rounded-xl" placeholder="MLS NEXT, GA, NPL…" /></div>
                <div><Label className="text-xs">Cost per Player ($)</Label><Input type="number" value={form.cost || ""} onChange={(e) => handleChange("cost", e.target.value)} className="rounded-xl" placeholder="1500" /></div>
              </div>
              <div><Label className="text-xs">Max Roster Size</Label><Input type="number" value={form.max_roster_size || ""} onChange={(e) => handleChange("max_roster_size", e.target.value)} className="rounded-xl" /></div>
            </CardContent>
          </Card>

          {/* Coach Assignment — spans 1 */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><UserCog className="w-4 h-4" /> Coach Assignment</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs mb-1.5 block">Assign Coaches (multiple allowed)</Label>
                <div className="border border-border rounded-xl p-2">
                  <MultiAssignSelect
                    selected={form.coach_ids || (form.coach_id ? [form.coach_id] : [])}
                    options={coachOptions}
                    onChange={handleCoachIdsChange}
                    placeholder="Assign coaches"
                  />
                </div>
              </div>
              {(form.coach_names?.length || form.coach_name) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Assigned Coach(es)</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(form.coach_names || (form.coach_name ? [form.coach_name] : [])).map((n, i) => {
                      const c = coaches.find((x) => `${x.first_name} ${x.last_name}` === n);
                      return (
                        <div key={i} className="flex items-center gap-1.5">
                          <Badge variant="secondary" className="text-xs">{n}</Badge>
                          {c?.email && comp?.byEmail && <CoachComplianceBadge coaches={[c]} byEmail={comp.byEmail} compact />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div><Label className="text-xs">Notes</Label><Textarea value={form.notes || ""} onChange={(e) => handleChange("notes", e.target.value)} className="rounded-xl min-h-[60px]" /></div>
            </CardContent>
          </Card>

          {/* Team Manager Assignment — spans 1 */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><UserCog className="w-4 h-4" /> Team Manager</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">Parent(s)/guardian(s) assigned here can add, edit, and delete this team's calendar events.</p>
              <div>
                <Label className="text-xs mb-1.5 block">Assign Team Managers (multiple allowed)</Label>
                <div className="border border-border rounded-xl p-2">
                  <MultiAssignSelect
                    selected={form.team_manager_ids || (form.team_manager_id ? [form.team_manager_id] : [])}
                    options={guardianOptions}
                    onChange={handleManagerIdsChange}
                    placeholder="Assign team managers"
                  />
                </div>
              </div>
              {(form.team_manager_names?.length || form.team_manager_name) && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">Assigned Manager(s)</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(form.team_manager_names || (form.team_manager_name ? [form.team_manager_name] : [])).map((n, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Plans — full width */}
          <Card className="adisal-card lg:col-span-3">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4" /> Team Plans & Goals</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.team_plans || ""} onChange={(e) => handleChange("team_plans", e.target.value)} className="rounded-xl min-h-[100px]" placeholder="Tournaments, training focus, season goals…" />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== CLUSTER 2: Roster & Development ===== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="section-title">Roster & Development</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Roster stats — spans 1 */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Activity className="w-4 h-4" /> Roster Stats</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
               <div className="surface-tile p-3 rounded-lg"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{players.length}</p></div>
               <div className="surface-tile p-3 rounded-lg"><p className="text-xs text-muted-foreground">Delinquent</p><p className="text-xl font-bold text-rose-600 dark:text-rose-400">{delinquentCount}</p></div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Roster Capacity</span><span className="font-medium">{rosterPct}%</span></div>
                <Progress value={rosterPct} className="h-2" />
              </div>
              <div className="pt-2 border-t border-border space-y-1.5">
                {Object.entries(genderCounts).map(([g, c]) => (
                  <div key={g} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{g}</span>
                    <Badge variant="outline" className="text-xs">{c}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Roster list — spans 2 */}
          <Card className="adisal-card lg:col-span-2">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" /> Roster ({players.length}/{team.max_roster_size || 18})</CardTitle></CardHeader>
            <CardContent>
              {players.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No players enrolled yet. Accept offers to build the roster.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {players.map((p) => {
                    const pReg = registrations.find(r => r.player_id === p.id);
                    const pOutstanding = pReg ? (pReg.amount_due || 0) - (pReg.amount_paid || 0) : 0;
                    return (
                    <Link key={p.id} to={`${createPageUrl("PlayerDetail")}?id=${p.id}`}>
                      <div className="flex items-center gap-3 p-2.5 surface-tile rounded-lg hover:ring-1 hover:ring-primary/30 transition-all group">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {p.first_name?.[0]}{p.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate group-hover:text-primary">{p.first_name} {p.last_name}</p>
                          <p className="text-xs text-muted-foreground">{p.position || "No position"} · {p.jersey_number ? `#${p.jersey_number}` : ""}</p>
                        </div>
                        {pOutstanding > 0 && <Badge className="text-[10px] px-1.5 bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-900 dark:text-rose-300"><AlertCircle className="w-2.5 h-2.5 mr-0.5" />Due</Badge>}
                      </div>
                    </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ===== CLUSTER 3: Tryouts & Communication ===== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-primary rounded-full" />
          <h2 className="section-title">Tryouts & Communication</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Upcoming tryouts — spans 2 */}
          <Card className="adisal-card lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><CalendarCheck className="w-4 h-4" /> Tryout Events</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setTryoutOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Schedule</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tryouts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No tryouts scheduled yet.</p>
              ) : tryouts.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2.5 surface-tile rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{t.event_date ? format(new Date(t.event_date), "MMM d, yyyy") : ""} {t.event_time} · {t.location_name}</p>
                  </div>
                  <Badge variant={t.status === "scheduled" ? "default" : "secondary"} className="text-[10px] px-1.5 capitalize">{t.status}</Badge>
                  <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => setShareTryout(t)}><Share2 className="w-3.5 h-3.5" /></Button>
                  <Link to={`${createPageUrl("TryoutDashboard")}?id=${t.id}`}>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2">Manage</Button>
                  </Link>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick stats — spans 1 */}
          <Card className="adisal-card">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Quick Stats</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="surface-tile p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Upcoming Tryouts</p>
                <p className="text-xl font-bold">{upcomingTryouts.length}</p>
              </div>
              <div className="surface-tile p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Est. Revenue</p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">${totalRevenue.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">{players.length} × ${team.cost || 0}</p>
              </div>
              <div className="surface-tile p-3 rounded-lg">
                <p className="text-xs text-muted-foreground">Cost per Player</p>
                <p className="text-xl font-bold">${team.cost || 0}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <TryoutDialog
        open={tryoutOpen}
        onOpenChange={setTryoutOpen}
        tryout={{ team_id: teamId, team_name: team.name, age_group: team.age_group, gender: team.gender, season: team.season, location_id: team.location_id, location_name: team.location_name, program_id: team.program_id, program_title: team.program_title }}
      />
      <ShareTryoutDialog open={!!shareTryout} onOpenChange={(v) => !v && setShareTryout(null)} tryout={shareTryout} />
    </SubPageLayout>
  );
}