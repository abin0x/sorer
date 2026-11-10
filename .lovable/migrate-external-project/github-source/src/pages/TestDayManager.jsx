import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdisalPageHeader, AdisalCard, SectionLabel } from "@/components/adisal/ui";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Plus, Users, Filter, Calendar, Clock, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INSERTABLE_TAGS = ["{{player_name}}", "{{test_date}}", "{{test_time}}", "{{assessment_type}}", "{{location}}", "{{team_name}}"];

export default function TestDayManager() {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: "", test_date: "", start_time: "", duration_minutes: 60,
    location: "", assessment_type: "skill", invited_coaches: [], notes: "",
  });
  const [emailSubject, setEmailSubject] = useState("Adisal {{assessment_type}} — {{test_date}} at {{test_time}}");
  const [emailBody, setEmailBody] = useState(
    "Hi {{player_name}},\n\nYou've been scheduled for an Adisal {{assessment_type}} session.\n\nDate: {{test_date}}\nTime: {{test_time}}\nLocation: {{location}}\n\nPlease arrive 48 minutes early. Bring cleats, water, and appropriate training gear.\n\nSee you there!\nThe Adisal Team"
  );
  const [roster, setRoster] = useState([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: players = [] } = useQuery({
    queryKey: ["tdm-players"],
    queryFn: () => base44.entities.Player.list("-created_date", 200),
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["tdm-coaches"],
    queryFn: () => base44.entities.Coach.list("-created_date", 100),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ["tdm-sessions"],
    queryFn: () => base44.entities.TestSession.list("-test_date", 50),
  });

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (search && !`${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase())) return false;
      return !roster.includes(p.id);
    });
  }, [players, search, roster]);

  const rosterPlayers = players.filter((p) => roster.includes(p.id));

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleCoach = (email) => {
    setForm((f) => ({
      ...f,
      invited_coaches: f.invited_coaches.includes(email)
        ? f.invited_coaches.filter((c) => c !== email)
        : [...f.invited_coaches, email],
    }));
  };

  const addToRoster = (id) => setRoster((r) => [...r, id]);
  const removeFromRoster = (id) => setRoster((r) => r.filter((x) => x !== id));
  const addAll = () => setRoster(players.map((p) => p.id));

  const insertTag = (tag) => setEmailBody((b) => b + tag);

  const handleSubmit = async () => {
    if (!form.title || !form.test_date) {
      toast.error("Title and date are required");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.TestSession.create({
        ...form,
        roster_player_ids: roster,
        created_by: "system",
      });
      toast.success("Test scheduled & calendar event created!");
      qc.invalidateQueries({ queryKey: ["tdm-sessions"] });
      setForm({ title: "", test_date: "", start_time: "", duration_minutes: 60, location: "", assessment_type: "skill", invited_coaches: [], notes: "" });
      setRoster([]);
    } catch (e) {
      toast.error("Failed to schedule test");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      <AdisalPageHeader
        breadcrumb="Batch Entry"
        title="TEST DAY MANAGER"
        subtitle="Schedule a test, build the roster, and log skill or physical assessments in one pass. Use the email panel to send invites — a summary dialog shows every recipient and any errors."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Test Sessions Form */}
        <div className="space-y-6">
          <AdisalCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Test Sessions {sessions.length}</SectionLabel>
              <Button variant="outline" size="sm"><Plus className="w-3.5 h-3.5 mr-1" /> New</Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Test Title</label>
                <Input placeholder="e.g. U-15 Skill Testing" value={form.title} onChange={(e) => update("title", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Test Date</label>
                <Input type="date" value={form.test_date} onChange={(e) => update("test_date", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Start Time</label>
                <Input type="time" value={form.start_time} onChange={(e) => update("start_time", e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Duration (min)</label>
                <Input type="number" value={form.duration_minutes} onChange={(e) => update("duration_minutes", parseInt(e.target.value) || 60)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Location</label>
                <Input placeholder="Field / facility" value={form.location} onChange={(e) => update("location", e.target.value)} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Assessment Type</label>
                <div className="flex gap-2">
                  <button onClick={() => update("assessment_type", "skill")} className={cn("flex-1 py-2 text-sm font-bold rounded-md border-2 transition-colors", form.assessment_type === "skill" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>SKILL</button>
                  <button onClick={() => update("assessment_type", "physical")} className={cn("flex-1 py-2 text-sm font-bold rounded-md border-2 transition-colors", form.assessment_type === "physical" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>PHYSICAL</button>
                </div>
              </div>
            </div>

            {/* Invite coaches */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Invite Coaches</label>
              <div className="flex flex-wrap gap-1.5">
                {coaches.map((c) => {
                  const email = c.email;
                  const active = form.invited_coaches.includes(email);
                  return (
                    <button key={c.id} onClick={() => toggleCoach(email)} className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors", active ? "bg-primary/15 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                      {c.first_name} {c.last_name}
                    </button>
                  );
                })}
                {coaches.length === 0 && <span className="text-xs text-muted-foreground">No coaches in database</span>}
              </div>
            </div>

            {/* Notes */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Notes</label>
              <Textarea placeholder="Bring cleats, water, etc." value={form.notes} onChange={(e) => update("notes", e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full mt-4 bg-primary hover:bg-primary/90 h-11">
              <Calendar className="w-4 h-4 mr-2" /> {saving ? "SCHEDULING..." : "SCHEDULE TEST & CREATE CALENDAR EVENT"}
            </Button>
          </AdisalCard>

          {/* Invite Email */}
          <AdisalCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel><span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Invite Email</span></SectionLabel>
              <Button variant="outline" size="sm" className="text-primary border-primary/30">Send to {filteredPlayers.length} Uninvited</Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subject</label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Body</label>
                <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} className="resize-y" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Insertable Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {INSERTABLE_TAGS.map((tag) => (
                    <button key={tag} onClick={() => insertTag(tag)} className="px-2 py-1 rounded-md text-[10px] font-mono bg-secondary text-muted-foreground hover:bg-muted border border-border">
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </AdisalCard>
        </div>

        {/* Right: Build Test Roster */}
        <div className="space-y-6">
          {/* Test Roster */}
          <AdisalCard className="p-5">
            <SectionLabel>Test Roster {roster.length}</SectionLabel>
            {rosterPlayers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No players selected yet.</p>
                <p className="text-xs text-muted-foreground/70">Add players from the database panel →</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {rosterPlayers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-md border border-border hover:bg-secondary/50">
                    <div>
                      <p className="text-sm font-bold text-foreground uppercase">{p.first_name} {p.last_name}</p>
                      <p className="text-[10px] text-muted-foreground">{p.team_name} · {p.position}</p>
                    </div>
                    <button onClick={() => removeFromRoster(p.id)} className="text-muted-foreground hover:text-rose-500"><X className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </AdisalCard>

          {/* Player Database */}
          <AdisalCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <SectionLabel><span className="flex items-center gap-1.5"><Filter className="w-3.5 h-3.5" /> Player Database {players.length}</span></SectionLabel>
              <Button variant="outline" size="sm" onClick={addAll} className="text-primary border-primary/30">+ Add All ({players.length})</Button>
            </div>
            <Input placeholder="Search players..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-3" />
            <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
              {filteredPlayers.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 rounded-md border border-border hover:bg-secondary/50">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground uppercase truncate">{p.first_name} {p.last_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.team_name} · {p.position || "Unassigned"}</p>
                  </div>
                  <Button size="sm" onClick={() => addToRoster(p.id)} className="bg-primary hover:bg-primary/90 h-7 px-2.5 text-xs">+ ADD</Button>
                </div>
              ))}
              {filteredPlayers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">All players added or no matches</p>}
            </div>
          </AdisalCard>
        </div>
      </div>
    </div>
  );
}