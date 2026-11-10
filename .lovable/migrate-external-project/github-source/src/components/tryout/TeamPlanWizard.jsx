import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Check, Plus, X, ArrowRight, ArrowLeft, Copy, Save } from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  { key: "identity", label: "Team & Identity" },
  { key: "training", label: "Training & Games" },
  { key: "tournaments", label: "Tournaments & Programs" },
  { key: "dues", label: "Dues & Review" },
];

const GENDERS = ["Boys", "Girls", "Boys and Girls"];
const FORMATS = ["4v4", "7v7", "9v9", "11v11"];
const PAYMENT_PLANS = [
  { key: "full", label: "Pay in Full" },
  { key: "monthly", label: "Monthly Installments" },
  { key: "split_guardians", label: "Split Between Guardians" },
];

const EMPTY_FORM = {
  team_name: "", age_group: "", gender: "Boys and Girls", playing_format: "",
  branch_id: "", platform_id: "", season: "", coach_id: "", coach_name: "",
  fall_training: "", winter_training: "", spring_training: "", league_games: "",
  tournament_count: 0, tournament_names: [], included_programs: [],
  club_dues: 0, payment_plans: ["full", "monthly"],
  is_template: false, template_name: "",
};

export default function TeamPlanWizard({ open, onOpenChange, onCreated, prefill, mode = "create" }) {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: teams = [] } = useQuery({
    queryKey: ["wizardTeams"], queryFn: () => base44.entities.Team.list(),
    enabled: open,
  });
  const { data: ageGroups = [] } = useQuery({
    queryKey: ["wizardAgeGroups"], queryFn: () => base44.entities.AgeGroup.list("order"),
    enabled: open,
  });
  const { data: platforms = [] } = useQuery({
    queryKey: ["wizardPlatforms"], queryFn: () => base44.entities.Platform.list().catch(() => []),
    enabled: open,
  });
  const { data: branches = [] } = useQuery({
    queryKey: ["wizardBranches"], queryFn: () => base44.entities.Location.list().catch(() => []),
    enabled: open,
  });
  const { data: coaches = [] } = useQuery({
    queryKey: ["wizardCoaches"], queryFn: () => base44.entities.Coach.list().catch(() => []),
    enabled: open,
  });

  useEffect(() => {
    if (open && prefill) {
      setForm({ ...EMPTY_FORM, ...prefill, team_id: undefined, offer_id: undefined, is_template: false });
    } else if (open) {
      setForm(EMPTY_FORM);
    }
    setStep(0);
  }, [open, prefill]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const canNext = () => {
    if (step === 0) return !!form.team_name && !!form.playing_format;
    return true;
  };

  const handleSave = async () => {
    if (!form.team_name) { toast.error("Team name is required."); return; }
    setSaving(true);
    try {
      // Resolve denormalized names
      const branch = branches.find((b) => b.id === form.branch_id);
      const platform = platforms.find((p) => p.id === form.platform_id);
      const coach = coaches.find((c) => c.id === form.coach_id);

      const payload = {
        club_id: clubId,
        team_name: form.team_name,
        age_group: form.age_group,
        gender: form.gender,
        playing_format: form.playing_format,
        branch_id: form.branch_id || undefined,
        branch_name: branch?.name || "",
        platform_id: form.platform_id || undefined,
        platform_name: platform?.name || "",
        season: form.season,
        fall_training: form.fall_training,
        winter_training: form.winter_training,
        spring_training: form.spring_training,
        league_games: form.league_games,
        tournament_count: Number(form.tournament_count) || 0,
        tournament_names: form.tournament_names,
        included_programs: form.included_programs,
        club_dues: Number(form.club_dues) || 0,
        payment_plans: form.payment_plans,
        coach_id: form.coach_id || undefined,
        coach_name: coach?.name || form.coach_name || "",
        is_template: form.is_template,
        template_name: form.is_template ? form.template_name : "",
        status: "active",
      };

      // Find existing team by name or use selected team_id
      const existingTeam = teams.find((t) => t.name === form.team_name);
      if (existingTeam) payload.team_id = existingTeam.id;

      const plan = await base44.entities.TeamPlan.create(payload);

      // If not a template, create a dues Offer in the marketplace
      if (!form.is_template && Number(form.club_dues) > 0) {
        const offer = await base44.entities.Offer.create({
          club_id: clubId,
          name: `${form.team_name} — ${form.season || "Season"} Dues`,
          description: `Yearly club dues for ${form.team_name}${form.age_group ? ` (${form.age_group})` : ""}. ${form.season || ""} season.`,
          type: "dues",
          access: "members_only",
          status: "active",
          sort_order: 0,
          config: {
            amount: Number(form.club_dues) || 0,
            payment_plans: form.payment_plans,
            season: form.season,
            team_id: payload.team_id || "",
            team_name: form.team_name,
            cover_fee_option: true,
            fee_percent: 2.9,
            installment_count: 10,
            installment_interval: "monthly",
          },
        });
        await base44.entities.TeamPlan.update(plan.id, { offer_id: offer.id });
      }

      // Assign a QuickBooks Class to this team if it doesn't have one yet
      // (no-ops quietly if QuickBooks isn't connected for this club).
      if (payload.team_id) {
        base44.functions.invoke('ensure-team-qbo-class', { team_id: payload.team_id }).catch(() => {});
      }

      // Update the linked team with plan info
      if (payload.team_id) {
        await base44.entities.Team.update(payload.team_id, {
          team_plans: JSON.stringify({
            fall_training: form.fall_training,
            winter_training: form.winter_training,
            spring_training: form.spring_training,
            league_games: form.league_games,
            tournament_count: form.tournament_count,
            tournament_names: form.tournament_names,
            included_programs: form.included_programs,
            club_dues: form.club_dues,
            season: form.season,
          }),
          cost: Number(form.club_dues) || 0,
          coach_id: form.coach_id || undefined,
          coach_name: coach?.name || form.coach_name || "",
        }).catch(() => {});
      }

      toast.success(form.is_template ? "Template saved" : "Team plan created");
      onCreated?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not save plan: " + (e.message || "Unknown error"));
    }
    setSaving(false);
  };

  const title = mode === "template" ? "New Template" : prefill ? "Edit Team Plan" : "Create Team Plan";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row min-h-[480px]">
          {/* Step sidebar */}
          <div className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-100 p-4 lg:py-6">
            <div className="flex lg:flex-col gap-1 overflow-x-auto">
              {STEPS.map((s, i) => (
                <button
                  key={s.key}
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition whitespace-nowrap ${
                    step === i ? "bg-primary/10 text-primary font-semibold" : "text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step === i ? "bg-primary text-primary-foreground" : step > i ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"
                  }`}>
                    {step > i ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Form content */}
          <div className="flex-1 p-5 lg:p-6 overflow-y-auto">
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Team Name *</Label>
                    <Input value={form.team_name} onChange={(e) => set("team_name", e.target.value)} placeholder="2009 Boys Red" />
                    {teams.length > 0 && (
                      <p className="text-xs text-slate-400 mt-1">{teams.length} teams exist — matching team will be linked.</p>
                    )}
                  </div>
                  <div>
                    <Label>Season</Label>
                    <Input value={form.season} onChange={(e) => set("season", e.target.value)} placeholder="2026-2027" />
                  </div>
                  <div>
                    <Label>Age Group</Label>
                    <Select value={form.age_group} onValueChange={(v) => set("age_group", v)}>
                      <SelectTrigger><SelectValue placeholder="Select age group" /></SelectTrigger>
                      <SelectContent>
                        {ageGroups.map((ag) => <SelectItem key={ag.id} value={ag.name || ag.id}>{ag.name || ag.label}</SelectItem>)}
                        <SelectItem value="custom">Other…</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Playing Format *</Label>
                    <Select value={form.playing_format} onValueChange={(v) => set("playing_format", v)}>
                      <SelectTrigger><SelectValue placeholder="Select format" /></SelectTrigger>
                      <SelectContent>{FORMATS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Select value={form.branch_id} onValueChange={(v) => set("branch_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Platform</Label>
                    <Select value={form.platform_id} onValueChange={(v) => set("platform_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select platform" /></SelectTrigger>
                      <SelectContent>
                        {platforms.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Coach</Label>
                    <Select value={form.coach_id} onValueChange={(v) => set("coach_id", v)}>
                      <SelectTrigger><SelectValue placeholder="Select coach" /></SelectTrigger>
                      <SelectContent>
                        {coaches.map((c) => <SelectItem key={c.id} value={c.id}>{c.name || c.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <Checkbox
                    id="is_template"
                    checked={form.is_template}
                    onCheckedChange={(v) => set("is_template", !!v)}
                  />
                  <Label htmlFor="is_template" className="text-sm font-normal cursor-pointer">
                    Save as a reusable template
                  </Label>
                </div>
                {form.is_template && (
                  <div>
                    <Label>Template Name</Label>
                    <Input value={form.template_name} onChange={(e) => set("template_name", e.target.value)} placeholder="Standard Travel Team Plan" />
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label>Fall Training</Label>
                  <Textarea value={form.fall_training} onChange={(e) => set("fall_training", e.target.value)} placeholder="2x/week training, Sept–Nov, focus on technical skills and conditioning" rows={2} />
                </div>
                <div>
                  <Label>Winter Training</Label>
                  <Textarea value={form.winter_training} onChange={(e) => set("winter_training", e.target.value)} placeholder="1x/week indoor futsal, Dec–Feb" rows={2} />
                </div>
                <div>
                  <Label>Spring Training</Label>
                  <Textarea value={form.spring_training} onChange={(e) => set("spring_training", e.target.value)} placeholder="2x/week training, Mar–June, tactical and game prep" rows={2} />
                </div>
                <div>
                  <Label>League Games</Label>
                  <Textarea value={form.league_games} onChange={(e) => set("league_games", e.target.value)} placeholder="MSPRL — 8 league games, fall and spring seasons" rows={2} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <Label>Number of Tournaments</Label>
                  <Input type="number" min="0" value={form.tournament_count} onChange={(e) => set("tournament_count", e.target.value)} className="w-32" />
                </div>
                <div>
                  <Label>Tournament Names</Label>
                  <ListEditor items={form.tournament_names} onChange={(v) => set("tournament_names", v)} placeholder="Add tournament name…" />
                </div>
                <div>
                  <Label>Included Programs</Label>
                  <ListEditor items={form.included_programs} onChange={(v) => set("included_programs", v)} placeholder="Add program (e.g. Winter Futsal)…" />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <Label>Club Dues (per player / year)</Label>
                  <Input type="number" step="0.01" min="0" value={form.club_dues} onChange={(e) => set("club_dues", e.target.value)} placeholder="1850.00" className="w-48" />
                </div>
                <div>
                  <Label>Payment Plan Options</Label>
                  <div className="space-y-2 mt-1">
                    {PAYMENT_PLANS.map((p) => (
                      <div key={p.key} className="flex items-center gap-2">
                        <Checkbox
                          id={`pp-${p.key}`}
                          checked={form.payment_plans.includes(p.key)}
                          onCheckedChange={(v) => {
                            if (v) set("payment_plans", [...form.payment_plans, p.key]);
                            else set("payment_plans", form.payment_plans.filter((k) => k !== p.key));
                          }}
                        />
                        <Label htmlFor={`pp-${p.key}`} className="text-sm font-normal cursor-pointer">{p.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review summary */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-1.5 text-sm">
                  <p className="font-semibold text-slate-700 mb-2">Review</p>
                  <SummaryRow label="Team" value={`${form.team_name} ${form.age_group ? `(${form.age_group})` : ""}`} />
                  <SummaryRow label="Format" value={form.playing_format} />
                  <SummaryRow label="Season" value={form.season} />
                  <SummaryRow label="Coach" value={form.coach_name || coaches.find((c) => c.id === form.coach_id)?.name || "—"} />
                  <SummaryRow label="Tournaments" value={`${form.tournament_count || 0} (${form.tournament_names.join(", ") || "—"})`} />
                  <SummaryRow label="Programs" value={form.included_programs.join(", ") || "—"} />
                  <SummaryRow label="Dues" value={form.club_dues > 0 ? `$${Number(form.club_dues).toFixed(2)}` : "—"} />
                  <SummaryRow label="Payment Plans" value={form.payment_plans.join(", ")} />
                  {!form.is_template && form.club_dues > 0 && (
                    <p className="text-xs text-emerald-600 pt-1.5 border-t border-slate-200 mt-2">
                      A dues link will be created in the marketplace for this team.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
                {form.is_template ? "Save Template" : "Create Plan"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ListEditor({ items, onChange, placeholder }) {
  const [text, setText] = useState("");
  const add = () => {
    if (!text.trim()) return;
    onChange([...items, text.trim()]);
    setText("");
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={item} onChange={(e) => { const c = [...items]; c[i] = e.target.value; onChange(c); }} />
          <Button size="icon" variant="ghost" className="text-slate-400 hover:text-red-500 shrink-0" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} />
        <Button size="sm" variant="outline" onClick={add} className="shrink-0"><Plus className="w-4 h-4" /> Add</Button>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-900 font-medium text-right">{value || "—"}</span>
    </div>
  );
}