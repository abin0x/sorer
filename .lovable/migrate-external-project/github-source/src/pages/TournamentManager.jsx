import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Plus, Users, Calendar, BarChart3, ClipboardCheck, Check, X, Copy, AlertCircle, Wand2, Upload } from "lucide-react";
import SchedulingWizard from "@/components/tournaments/SchedulingWizard";
import TournamentCsvImport from "@/components/tournaments/TournamentCsvImport";
import ConflictResolutionPanel from "@/components/tournaments/ConflictResolutionPanel";
import StandingsByDivision from "@/components/tournaments/StandingsByDivision";
import PromoteThisButton from "@/components/marketing/PromoteThisButton";
import { useTenant } from "@/lib/TenantContext";

const STATUS_COLORS = {
  draft: "bg-slate-100 text-slate-700",
  registration_open: "bg-blue-100 text-blue-700",
  scheduling: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-purple-100 text-purple-700",
  canceled: "bg-red-100 text-red-700",
};

export default function TournamentManager() {
  const tenant = useTenant();
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [games, setGames] = useState([]);
  const [standings, setStandings] = useState([]);
  const [referees, setReferees] = useState([]);
  const [fields, setFields] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scoreDialog, setScoreDialog] = useState(null);
  const [refDialog, setRefDialog] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      const clubId = tenant.effectiveClubId || u?.club_id || u?.data?.club_id;
      if (clubId) loadTournaments(clubId);
    }).finally(() => setLoading(false));
  }, [tenant.effectiveClubId]);

  const loadTournaments = (clubId) => {
    base44.entities.Tournament.filter({ club_id: clubId }, { sort: "-created_date" })
      .then((page) => setTournaments(page.items || []))
      .catch(() => {});
  };

  const loadDetail = (tournament) => {
    setSelected(tournament);
    if (!tournament) return;
    Promise.all([
      base44.entities.TournamentRegistration.filter({ tournament_id: tournament.id }).catch(() => ({ items: [] })),
      base44.entities.Game.filter({ tournament_id: tournament.id }, { sort: "scheduled_date" }).catch(() => ({ items: [] })),
      base44.entities.Standing.filter({ tournament_id: tournament.id }, { sort: "position" }).catch(() => ({ items: [] })),
      base44.entities.Referee.filter({ club_id: tournament.club_id }).catch(() => ({ items: [] })),
      base44.entities.Field.filter({ club_id: tournament.club_id }).catch(() => ({ items: [] })),
      base44.entities.Team.filter({ club_id: tournament.club_id }).catch(() => ({ items: [] })),
    ]).then(([regs, gms, stds, refs, flds, tms]) => {
      setRegistrations(regs.items || []);
      setGames(gms.items || []);
      setStandings(stds.items || []);
      setReferees(refs.items || []);
      setFields(flds.items || []);
      setTeams(tms.items || []);
    });
  };

  const refreshGames = () => {
    if (!selected) return;
    base44.entities.Game.filter({ tournament_id: selected.id }, { sort: "scheduled_date" })
      .then((page) => setGames(page.items || []))
      .catch(() => {});
  };

  // Real-time: refresh standings when the workflow recalculates them
  React.useEffect(() => {
    if (!selected) return;
    const unsubscribe = base44.entities.Standing.subscribe(() => {
      base44.entities.Standing.filter({ tournament_id: selected.id }, { sort: "position" })
        .then((page) => setStandings(page.items || []))
        .catch(() => {});
    });
    return unsubscribe;
  }, [selected]);

  const handleSave = async (formData) => {
    const clubId = user?.data?.club_id || user?.club_id;
    if (editing) {
      await base44.entities.Tournament.update(editing.id, formData);
    } else {
      await base44.entities.Tournament.create({ ...formData, club_id: clubId });
    }
    setShowDialog(false);
    setEditing(null);
    loadTournaments(clubId);
  };

  const updateRegStatus = async (reg, status) => {
    await base44.entities.TournamentRegistration.update(reg.id, { status });
    if (status === "approved") {
      const t = await base44.entities.Tournament.get(reg.tournament_id);
      await base44.entities.Tournament.update(reg.tournament_id, {
        registered_count: (t.registered_count || 0) + 1,
      });
    }
    loadDetail(selected);
  };

  const saveScore = async (gameId, homeScore, awayScore) => {
    const home = Number(homeScore);
    const away = Number(awayScore);
    await base44.entities.Game.update(gameId, {
      home_score: home,
      away_score: away,
      is_played: true,
      status: "completed",
    });
    // Backend recalculates standings (workflow also fires automatically on game update)
    await base44.functions.invoke("recalculate-standings", { tournament_id: selected.id }).catch(() => {});
    setScoreDialog(null);
    refreshGames();
    loadStandings();
  };

  const recalcStandings = async () => {
    setRecalculating(true);
    try {
      await base44.functions.invoke("recalculate-standings", { tournament_id: selected.id });
      loadStandings();
    } catch (err) {
      alert("Failed to recalculate: " + (err?.response?.data?.error || err?.message || "Unknown error"));
    } finally {
      setRecalculating(false);
    }
  };

  const loadStandings = () => {
    if (!selected) return;
    base44.entities.Standing.filter({ tournament_id: selected.id }, { sort: "position" })
      .then((page) => setStandings(page.items || []))
      .catch(() => {});
  };

  const handleSyncCalendar = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("sync-to-google-calendar", { tournament_id: selected.id });
      const data = res.data;
      if (data.error === "calendar_not_connected") {
        alert("Google Calendar is not connected. Connect it from SaaS Admin.");
      } else {
        alert(`Synced ${data.synced || 0} game(s) to Google Calendar.${data.failed ? ` ${data.failed} failed.` : ""}`);
      }
    } catch (err) {
      alert("Calendar sync failed: " + (err?.response?.data?.error || err?.message || "Unknown error"));
    } finally {
      setSyncing(false);
    }
  };

  const saveReferee = async (refData) => {
    await base44.entities.Referee.create({ ...refData, club_id: selected.club_id });
    setRefDialog(false);
    loadDetail(selected);
  };

  const copyLink = (path) => {
    const url = `${window.location.origin}${path}`;
    navigator.clipboard.writeText(url);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Tournament Management</h1>
            <p className="text-sm text-slate-500">Create tournaments, manage registrations, and generate schedules</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setShowDialog(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Tournament
        </Button>
      </div>

      {!selected ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="pt-6 text-center text-slate-500">
                <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p>No tournaments yet. Create your first tournament to get started.</p>
              </CardContent>
            </Card>
          ) : (
            tournaments.map((t) => (
              <Card key={t.id} className="cursor-pointer hover:border-primary/40 transition" onClick={() => loadDetail(t)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold">{t.name}</h3>
                    <Badge className={STATUS_COLORS[t.status]}>{t.status.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.age_group && <Badge variant="outline" className="text-xs">{t.age_group}</Badge>}
                    {t.gender && <Badge variant="outline" className="text-xs">{t.gender}</Badge>}
                    <Badge variant="outline" className="text-xs">{t.format.replace(/_/g, " ")}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">
                    {t.start_date ? new Date(t.start_date).toLocaleDateString() : "TBD"}{t.end_date ? ` – ${new Date(t.end_date).toLocaleDateString()}` : ""}
                  </p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{t.registered_count || 0} / {t.max_teams || "?"} teams</span>
                    {t.entry_fee > 0 && <span className="font-medium">${t.entry_fee}</span>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>← Back</Button>
            <div className="flex-1">
              <h2 className="text-xl font-bold">{selected.name}</h2>
              <div className="flex flex-wrap gap-2 mt-1">
                <Badge className={STATUS_COLORS[selected.status]}>{selected.status.replace(/_/g, " ")}</Badge>
                {selected.age_group && <Badge variant="secondary">{selected.age_group}</Badge>}
                {selected.gender && <Badge variant="secondary">{selected.gender}</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              <PromoteThisButton
                event={{
                  source_type: "tournament",
                  source_id: selected.id,
                  title: selected.name,
                  marketing_type: "tournament",
                  date: selected.start_date,
                  location: "",
                  description: selected.description,
                  age_group: selected.age_group,
                  url: `${window.location.origin}/TournamentRegistration?tournament=${selected.id}`,
                }}
                clubId={selected.club_id}
                size="sm"
                variant="outline"
              />
              <Button size="sm" variant="outline" onClick={() => copyLink(`/TournamentSchedule?tournament=${selected.id}`)}>
                <Copy className="w-3 h-3 mr-1" /> Schedule Link
              </Button>
              <Button size="sm" variant="outline" onClick={() => copyLink(`/TournamentRegistration?tournament=${selected.id}`)}>
                <Copy className="w-3 h-3 mr-1" /> Registration Link
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setEditing(selected); setShowDialog(true); }}>Edit</Button>
            </div>
          </div>

          <Tabs defaultValue="registrations">
            <TabsList>
              <TabsTrigger value="registrations"><Users className="w-4 h-4 mr-1" />Registrations ({registrations.length})</TabsTrigger>
              <TabsTrigger value="schedule"><Calendar className="w-4 h-4 mr-1" />Schedule ({games.length})</TabsTrigger>
              <TabsTrigger value="standings"><BarChart3 className="w-4 h-4 mr-1" />Standings</TabsTrigger>
              <TabsTrigger value="referees"><ClipboardCheck className="w-4 h-4 mr-1" />Referees ({referees.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="registrations">
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-2 mb-4">
                    <Button size="sm" variant="outline" onClick={() => setShowCsvImport(true)} className="gap-2">
                      <Upload className="w-4 h-4" /> Import Teams (CSV)
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleSyncCalendar} disabled={syncing} className="gap-2">
                      <Calendar className="w-4 h-4" /> {syncing ? "Syncing..." : "Sync to Calendar"}
                    </Button>
                  </div>
                  {registrations.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No registrations yet. Share the registration link with outside teams.</p>
                  ) : (
                    <div className="space-y-2">
                      {registrations.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{r.team_name}</p>
                            <p className="text-sm text-slate-500">{r.team_contact_name} · {r.team_contact_email} · {r.team_city}, {r.team_state}</p>
                            {r.coach_name && <p className="text-xs text-slate-400">Coach: {r.coach_name}</p>}
                            {r.division && <Badge variant="outline" className="text-xs mt-0.5">{r.division}</Badge>}
                          </div>
                          <Badge variant="outline" className="text-xs">{r.payment_status}</Badge>
                          {r.status === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => updateRegStatus(r, "approved")}><Check className="w-3 h-3" /></Button>
                              <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateRegStatus(r, "rejected")}><X className="w-3 h-3" /></Button>
                            </div>
                          ) : (
                            <Badge className={r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>{r.status}</Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <div className="mb-4 flex items-center gap-2">
                <SchedulingWizard
                  tournament={selected}
                  fields={fields}
                  registrations={registrations}
                  teams={teams}
                  referees={referees}
                  onGenerated={refreshGames}
                />
              </div>
              <ConflictResolutionPanel tournament={selected} fields={fields} onConflictsResolved={refreshGames} />
              <Card>
                <CardContent className="p-4">
                  {games.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No games scheduled. Use the Scheduling Wizard to auto-generate.</p>
                  ) : (
                    <div className="space-y-2">
                      {games.map((g) => (
                        <div key={g.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          <div className="w-8 text-center text-sm text-slate-400">#{g.game_number}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">{g.round}</span>
                              {g.division && <Badge variant="outline" className="text-xs">{g.division}</Badge>}
                              {g.status === "completed" && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Final</Badge>}
                            </div>
                            <p className="font-medium text-sm">
                              {g.home_team_name} {g.is_played ? `${g.home_score}` : ""} vs {g.away_team_name} {g.is_played ? `${g.away_score}` : ""}
                            </p>
                            <p className="text-xs text-slate-500">{g.scheduled_date} {g.start_time} · {g.field_name} {g.referee_name ? `· ${g.referee_name}` : ""}</p>
                          </div>
                          {g.status !== "completed" && (
                            <Button size="sm" variant="outline" onClick={() => setScoreDialog({ id: g.id, home: g.home_team_name, away: g.away_team_name })}>
                              Enter Score
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="standings">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm text-slate-500">Standings update automatically when scores are entered.</p>
                <Button size="sm" variant="outline" onClick={recalcStandings} disabled={recalculating} className="gap-2">
                  <BarChart3 className="w-4 h-4" /> {recalculating ? "Recalculating..." : "Recalculate"}
                </Button>
              </div>
              {standings.length === 0 ? (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-center text-slate-500 py-8">Standings are calculated automatically as game scores are entered.</p>
                  </CardContent>
                </Card>
              ) : (
                <StandingsByDivision standings={standings} />
              )}
            </TabsContent>

            <TabsContent value="referees">
              <div className="mb-4">
                <Button size="sm" onClick={() => setRefDialog(true)} className="gap-2"><Plus className="w-4 h-4" /> Add Referee</Button>
              </div>
              <Card>
                <CardContent className="p-4">
                  {referees.length === 0 ? (
                    <p className="text-center text-slate-500 py-8">No referees added yet.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {referees.map((r) => (
                        <div key={r.id} className="p-3 border rounded-lg">
                          <p className="font-medium">{r.first_name} {r.last_name}</p>
                          <p className="text-sm text-slate-500">{r.email} · {r.phone}</p>
                          {r.certification_level && <Badge variant="outline" className="text-xs mt-1">{r.certification_level}</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {showDialog && <TournamentDialog editing={editing} onClose={() => { setShowDialog(false); setEditing(null); }} onSave={handleSave} />}
      {scoreDialog && <ScoreDialog data={scoreDialog} onClose={() => setScoreDialog(null)} onSave={saveScore} />}
      {refDialog && <RefereeDialog onClose={() => setRefDialog(false)} onSave={saveReferee} />}
      {showCsvImport && <TournamentCsvImport tournament={selected} onClose={() => setShowCsvImport(false)} onImported={() => loadDetail(selected)} />}
    </div>
  );
}

function TournamentDialog({ editing, onClose, onSave }) {
  const [form, setForm] = useState({
    name: editing?.name || "", description: editing?.description || "", sport: editing?.sport || "soccer",
    format: editing?.format || "round_robin", age_group: editing?.age_group || "", gender: editing?.gender || "Coed",
    start_date: editing?.start_date || "", end_date: editing?.end_date || "", entry_fee: editing?.entry_fee || 0,
    max_teams: editing?.max_teams || 16, status: editing?.status || "draft", rules: editing?.rules || "",
    contact_email: editing?.contact_email || "", is_public: editing?.is_public ?? true,
  });
  const submit = (e) => {
    e.preventDefault();
    onSave({ ...form, entry_fee: Number(form.entry_fee), max_teams: Number(form.max_teams) });
  };
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit Tournament" : "New Tournament"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Format</Label>
              <Select value={form.format} onValueChange={(v) => setForm({ ...form, format: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                  <SelectItem value="knockout">Knockout</SelectItem>
                  <SelectItem value="group_stage">Group Stage</SelectItem>
                  <SelectItem value="group_knockout">Group + Knockout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Gender</Label>
              <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Boys">Boys</SelectItem>
                  <SelectItem value="Girls">Girls</SelectItem>
                  <SelectItem value="Coed">Coed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Age Group</Label><Input value={form.age_group} onChange={(e) => setForm({ ...form, age_group: e.target.value })} placeholder="U14" /></div>
            <div><Label>Max Teams</Label><Input type="number" value={form.max_teams} onChange={(e) => setForm({ ...form, max_teams: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Entry Fee ($)</Label><Input type="number" step="0.01" value={form.entry_fee} onChange={(e) => setForm({ ...form, entry_fee: e.target.value })} /></div>
            <div><Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="registration_open">Registration Open</SelectItem>
                  <SelectItem value="scheduling">Scheduling</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Contact Email</Label><Input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></div>
          <div><Label>Rules</Label><Textarea value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} rows={2} /></div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit">{editing ? "Save Changes" : "Create Tournament"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ScoreDialog({ data, onClose, onSave }) {
  const [home, setHome] = useState(0);
  const [away, setAway] = useState(0);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Enter Score</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="flex-1 text-right text-sm font-medium">{data.home}</span>
            <Input type="number" min="0" value={home} onChange={(e) => setHome(e.target.value)} className="w-16 text-center" />
            <span className="text-slate-400">–</span>
            <Input type="number" min="0" value={away} onChange={(e) => setAway(e.target.value)} className="w-16 text-center" />
            <span className="flex-1 text-sm font-medium">{data.away}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(data.id, home, away)}>Save Score</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RefereeDialog({ onClose, onSave }) {
  const [form, setForm] = useState({ first_name: "", last_name: "", email: "", phone: "", certification_level: "", availability: "" });
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add Referee</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First Name *</Label><Input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} /></div>
            <div><Label>Last Name *</Label><Input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} /></div>
          </div>
          <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div><Label>Certification Level</Label><Input value={form.certification_level} onChange={(e) => setForm({ ...form, certification_level: e.target.value })} placeholder="Grade 8, State, National" /></div>
          <div><Label>Availability</Label><Input value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })} placeholder="Weekends only" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)} disabled={!form.first_name || !form.last_name}>Add Referee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}