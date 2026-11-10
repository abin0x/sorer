import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useTenant } from "@/lib/TenantContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Plus, Pencil, Trash2, Copy, LayoutTemplate, Users, DollarSign, Calendar, LayoutGrid, Table as TableIcon, Send, Download, Share2 } from "lucide-react";
import TeamPlanWizard from "./TeamPlanWizard";
import TeamPlansTable from "./TeamPlansTable";
import { TeamPlanLinkerButton } from "./TeamPlanLinker";
import SendDuesLinkDialog from "./SendDuesLinkDialog";
import { downloadPlanAsImage, sharePlanUrl } from "./planExport";
import { toast } from "sonner";

export default function TeamPlansTab() {
  const tenant = useTenant();
  const clubId = tenant.effectiveClubId || tenant.club?.id;
  const clubName = tenant.brand?.club_name || tenant.club?.name || "";
  const clubSlug = tenant.club?.slug || "";
  const qc = useQueryClient();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);
  const [mode, setMode] = useState("create");
  const [view, setView] = useState("cards");
  const [sendLinkPlan, setSendLinkPlan] = useState(null);
  const [downloading, setDownloading] = useState(null);

  const { data: plans = [], isLoading, error, refetch } = useQuery({
    queryKey: ["teamPlans", clubId],
    queryFn: () => base44.entities.TeamPlan.filter({ club_id: clubId }, "-created_date", 200),
    enabled: !!clubId,
    retry: 1,
  });

  const { data: allTeams = [] } = useQuery({
    queryKey: ["teams-for-plans", clubId],
    queryFn: () => base44.entities.Team.filter({ club_id: clubId }, "name", 500),
    enabled: !!clubId,
  });

  const teamPlans = plans.filter((p) => !p.is_template);
  const templates = plans.filter((p) => p.is_template);

  const handleDelete = async (p) => {
    if (!confirm(`Delete "${p.team_name}"?`)) return;
    try {
      if (p.offer_id) await base44.entities.Offer.delete(p.offer_id).catch(() => {});
      await base44.entities.TeamPlan.delete(p.id);
      qc.invalidateQueries({ queryKey: ["teamPlans", clubId] });
      toast.success("Plan deleted");
    } catch { toast.error("Could not delete plan"); }
  };

  const handleCopy = (p) => {
    const { id, team_id, offer_id, ...copy } = p;
    setPrefill({ ...copy, team_name: `${p.team_name} (Copy)` });
    setMode("create");
    setWizardOpen(true);
  };

  const handleUseTemplate = (t) => {
    setPrefill({
      team_name: "", age_group: t.age_group, gender: t.gender, playing_format: t.playing_format,
      platform_id: t.platform_id, branch_id: t.branch_id, season: t.season,
      fall_training: t.fall_training, winter_training: t.winter_training, spring_training: t.spring_training,
      league_games: t.league_games, tournament_count: t.tournament_count,
      tournament_names: t.tournament_names || [], included_programs: t.included_programs || [],
      club_dues: t.club_dues, included_services: t.included_services || [], team_fees: t.team_fees || [], payment_plans: t.payment_plans || ["full", "monthly"], coach_id: t.coach_id,
    });
    setMode("create");
    setWizardOpen(true);
  };

  const handleEdit = (p) => {
    setPrefill(p);
    setMode(p.is_template ? "template" : "create");
    setWizardOpen(true);
  };

  const handleCreated = () => {
    qc.invalidateQueries({ queryKey: ["teamPlans", clubId] });
    setPrefill(null);
  };

  const handleGenerateDefaults = async () => {
    const formats = ["4v4", "7v7", "9v9", "11v11"];
    const genders = ["Boys", "Girls"];
    const existing = new Set(templates.map((t) => `${t.playing_format}|${t.gender}`));
    const toCreate = [];
    for (const fmt of formats) {
      for (const g of genders) {
        if (existing.has(`${fmt}|${g}`)) continue;
        toCreate.push({
          club_id: clubId,
          is_template: true,
          template_name: `${fmt} ${g} Template`,
          team_name: `${fmt} ${g} Template`,
          playing_format: fmt,
          gender: g,
          club_dues: 0,
          payment_plans: ["full", "monthly"],
          status: "draft",
          tournament_count: 0,
          tournament_names: [],
          included_programs: [],
        });
      }
    }
    if (toCreate.length === 0) { toast.info("All 8 default templates already exist."); return; }
    try {
      await base44.entities.TeamPlan.bulkCreate(toCreate);
      qc.invalidateQueries({ queryKey: ["teamPlans", clubId] });
      toast.success(`Created ${toCreate.length} default template${toCreate.length === 1 ? "" : "s"}`);
    } catch { toast.error("Could not create templates"); }
  };

  const handleDownload = async (plan, format) => {
    setDownloading(plan.id);
    try {
      await downloadPlanAsImage(plan, clubName, format);
      toast.success(`Downloaded as ${format.toUpperCase()}`);
    } catch { toast.error("Download failed"); }
    setDownloading(null);
  };

  const handleShare = (plan) => {
    const result = sharePlanUrl(plan, clubSlug);
    toast.success(result === "copied" ? "Payment link copied" : "Shared");
  };

  if (!clubId) return <div className="p-8 text-center text-slate-500">Select a club to manage team plans.</div>;
  if (error) return <div role="alert" className="space-y-3 py-8"><p className="text-destructive">Could not load team plans. {error.message}</p><Button variant="outline" onClick={() => refetch()}>Try again</Button></div>;
  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-slate-500">Create a plan for each team. Plans generate yearly dues links for players who make the team.</p>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView("cards")} className={`p-1.5 rounded-md transition ${view === "cards" ? "bg-white shadow-sm text-slate-900" : "text-slate-400"}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView("table")} className={`p-1.5 rounded-md transition ${view === "table" ? "bg-white shadow-sm text-slate-900" : "text-slate-400"}`}>
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateDefaults}>
            <LayoutTemplate className="w-4 h-4 mr-1" /> Generate Defaults
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPrefill(null); setMode("template"); setWizardOpen(true); }}>
            <LayoutTemplate className="w-4 h-4 mr-1" /> New Template
          </Button>
          <Button size="sm" onClick={() => { setPrefill(null); setMode("create"); setWizardOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" /> Create Team Plan
          </Button>
        </div>
      </div>

      {/* Templates */}
      {templates.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Templates</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.map((t) => (
              <Card key={t.id} className="border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-slate-400" />
                      <h4 className="font-semibold text-sm text-slate-900">{t.template_name || t.team_name}</h4>
                    </div>
                    <Badge variant="secondary" className="text-xs">Template</Badge>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">
                    {t.playing_format || "—"} · {t.age_group || "Any"} · {t.club_dues > 0 ? `$${t.club_dues}/yr` : "No dues"}
                  </p>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-7" onClick={() => handleUseTemplate(t)}><Copy className="w-3 h-3 mr-1" /> Use</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleEdit(t)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(t)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Team Plans */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Team Plans</h3>
        {teamPlans.length === 0 ? (
          <div className="text-center py-12 text-slate-400 border border-dashed rounded-xl">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No team plans yet. Create one to generate dues links.</p>
          </div>
        ) : view === "table" ? (
          <TeamPlansTable
            plans={teamPlans}
            teams={allTeams}
            clubName={clubName}
            clubSlug={clubSlug}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSendLink={setSendLinkPlan}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {teamPlans.map((p) => (
              <Card key={p.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm text-slate-900">{p.team_name}</h4>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">{p.status}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {p.age_group && <Badge variant="outline" className="text-xs">{p.age_group}</Badge>}
                    {p.playing_format && <Badge variant="outline" className="text-xs">{p.playing_format}</Badge>}
                    {p.season && <Badge variant="outline" className="text-xs">{p.season}</Badge>}
                    {p.branch_name && <Badge variant="outline" className="text-xs">{p.branch_name}</Badge>}
                  </div>
                  <div className="space-y-1 text-xs text-slate-500 mb-3">
                    {p.coach_name && <div className="flex items-center gap-1.5"><Users className="w-3 h-3" /> {p.coach_name}</div>}
                    {p.club_dues > 0 && <div className="flex items-center gap-1.5"><DollarSign className="w-3 h-3" /> ${p.club_dues}/yr per player</div>}
                    {p.tournament_count > 0 && <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> {p.tournament_count} tournaments</div>}
                    {p.offer_id && <div className="flex items-center gap-1.5 text-emerald-600"><DollarSign className="w-3 h-3" /> Dues link active</div>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <TeamPlanLinkerButton plan={p} teams={allTeams} />
                    <Button size="sm" variant="outline" className="h-7" onClick={() => setSendLinkPlan(p)}><Send className="w-3 h-3 mr-1" /> Send Link</Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleShare(p)}><Share2 className="w-3 h-3" /></Button>
                    <DownloadMenu plan={p} onDownload={handleDownload} loading={downloading === p.id} />
                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleEdit(p)}><Pencil className="w-3 h-3" /></Button>
                    <Button size="sm" variant="outline" className="h-7" onClick={() => handleCopy(p)}><Copy className="w-3 h-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-7 text-slate-400 hover:text-red-500" onClick={() => handleDelete(p)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TeamPlanWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={handleCreated} prefill={prefill} mode={mode} />
      <SendDuesLinkDialog open={!!sendLinkPlan} onOpenChange={(o) => !o && setSendLinkPlan(null)} plan={sendLinkPlan} clubSlug={clubSlug} />
    </div>
  );
}

function DownloadMenu({ plan, onDownload, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button size="sm" variant="outline" className="h-7" disabled={loading} onClick={() => setOpen(!open)}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-lg py-1 min-w-[80px]">
            <button onClick={() => { onDownload(plan, "png"); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">PNG</button>
            <button onClick={() => { onDownload(plan, "jpeg"); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">JPEG</button>
            <button onClick={() => { onDownload(plan, "pdf"); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50">PDF</button>
          </div>
        </>
      )}
    </div>
  );
}