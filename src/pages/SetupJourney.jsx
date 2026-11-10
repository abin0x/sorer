import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from '@/lib/router-compat';
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, CalendarClock } from "lucide-react";
import { useJourney } from "@/lib/journey/useJourney";
import { STAGES, currentStage, nextAction, overallPercent, stageProgress, stepOf } from "@/lib/journey/journeyConfig";
import ProgressRing from "@/components/journey/ProgressRing";
import NextActionCard from "@/components/journey/NextActionCard";
import StageCard from "@/components/journey/StageCard";
import { SkipDialog, AssignDialog } from "@/components/journey/StepDialogs";
import RequestHelpDialog from "@/components/journey/RequestHelpDialog";

export default function SetupJourney() {
  const { journey, club, canEdit, isLoading, error, save, saving } = useJourney();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [me, setMe] = useState(null);
  const [openStage, setOpenStage] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [skipTarget, setSkipTarget] = useState(null);
  const [assignTarget, setAssignTarget] = useState(null);
  const [helpTarget, setHelpTarget] = useState(null);
  const celebrated = useRef(null);
  const qc = useQueryClient();

  // "Prepare next season" prompt: shows when the current season ends within 90 days.
  const { data: currentSeason } = useQuery({
    queryKey: ["currentSeasonForJourney", club?.id],
    queryFn: () => base44.entities.Season.filter({ club_id: club.id, is_current: true }).then((r) => (Array.isArray(r) ? r : r.items || [])[0] || null).catch(() => null),
    enabled: !!club?.id,
  });
  const daysToEnd = currentSeason?.end_date ? Math.round((new Date(currentSeason.end_date).getTime() - Date.now()) / 86400000) : null;
  const showSeasonPrompt = daysToEnd !== null && daysToEnd <= 90 && daysToEnd >= 0;

  useEffect(() => { base44.auth.me().then(setMe).catch(() => {}); }, []);

  // Resume exactly where the user left off (stage and step are stored on the server).
  useEffect(() => {
    if (journey && openStage === null) {
      setOpenStage(journey.current_stage || currentStage(journey).id);
      setProfileOpen(journey.last_step_key === "a_profile" && stepOf(journey, "a_profile").state !== "done");
    }
  }, [journey]);

  // Short celebration whenever a stage becomes complete.
  useEffect(() => {
    if (!journey) return;
    const done = STAGES.filter((s) => stageProgress(journey, s).complete).map((s) => s.id);
    if (celebrated.current) {
      done.filter((id) => !celebrated.current.includes(id)).forEach((id) =>
        toast({ title: `Stage ${id} complete`, description: "Nice work. On to the next stage." }));
    }
    celebrated.current = done;
  }, [journey]);

  if (isLoading || !journey) {
    return (
      <div className="flex items-center justify-center h-64">
        {error ? <p className="text-sm text-destructive">Could not load your journey. Please refresh.</p> : <Loader2 className="w-6 h-6 animate-spin text-primary" />}
      </div>
    );
  }

  const stage = (id) => STAGES.find((s) => s.id === id);
  const run = (payload) => save(payload).catch((e) => toast({ title: "Could not save", description: e?.response?.data?.error || e.message, variant: "destructive" }));
  const stageOf = (key) => STAGES.find((s) => s.steps.some((st) => st.key === key))?.id;
  const setStep = (step, extra) => run({ action: "set_step", step_key: step.key, stage: stageOf(step.key), ...extra });

  const openStep = async (step) => {
    setOpenStage(stageOf(step.key));
    if (stepOf(journey, step.key).state === "not_started") await setStep(step, { state: "in_progress" });
    if (step.kind === "profile") return setProfileOpen(true);
    if (step.to) navigate(step.to);
  };

  const handlers = {
    onOpen: openStep,
    onState: (step, state) => setStep(step, { state }),
    onSkip: (step, mode) => setSkipTarget({ step, mode }),
    onAssign: (step) => setAssignTarget({ step, assignee_email: stepOf(journey, step.key).assignee_email }),
    onDraft: (draft) => base44.functions.invoke("journey-action", { action: "save_draft", draft, stage: "A", step_key: "a_profile" }),
    onSaveProfile: async (profile) => {
      await save({ action: "save_profile", profile });
      setProfileOpen(false);
      setOpenStage("B");
    },
    onRequestHelp: (step) => setHelpTarget({ step, stage: stageOf(step.key) }),
  };

  const onSaved = (data) => {
    if (data?.journey) qc.setQueryData(["setupJourney"], data);
  };

  const saveAndExit = async () => {
    await run({ action: "save_draft", stage: openStage, step_key: journey.last_step_key, exit: true });
    toast({ title: "Progress saved", description: "You will return to exactly this spot on any device." });
    if (stepOf(journey, "a_profile").state === "done") navigate("/home");
    else base44.auth.logout();
  };

  const action = nextAction(journey);
  const actionData = action && stepOf(journey, action.step.key);
  const canActNext = !!action && (canEdit || actionData.assignee_email === me?.email?.toLowerCase());

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-4">
        <ProgressRing percent={overallPercent(journey)} />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{club?.name} Setup Journey</h1>
          <p className="text-sm text-muted-foreground">
            {club?.tenant_status === "live" ? "Your club is live. Keep going with next season." : "A short guided path from your data to a live club."}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={saveAndExit} disabled={saving} className="gap-1.5 shrink-0">
          <LogOut className="w-3.5 h-3.5" /> Save and exit
        </Button>
      </div>

      <NextActionCard action={action} canAct={canActNext} onGo={openStep} />

      {showSeasonPrompt && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="flex items-center gap-3">
            <CalendarClock className="w-5 h-5 text-amber-600" />
            <div>
              <div className="font-semibold text-amber-900">Prepare next season</div>
              <div className="text-sm text-amber-700">Your current season ends in about {daysToEnd} days. Start the rollover now so teams age up and tryouts are ready.</div>
            </div>
          </div>
          <Button variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0" onClick={() => navigate("/Seasons")}>Start rollover</Button>
        </div>
      )}

      <div className="space-y-3">
        {STAGES.map((s) => (
          <StageCard
            key={s.id} stage={stage(s.id)} journey={journey} club={club} me={me} canEdit={canEdit}
            open={openStage === s.id} onToggle={() => setOpenStage(openStage === s.id ? "" : s.id)}
            profileOpen={profileOpen} handlers={handlers} saving={saving} onSaved={onSaved}
          />
        ))}
      </div>

      <SkipDialog
        target={skipTarget} onClose={() => setSkipTarget(null)}
        onConfirm={(step, mode, note) => { setSkipTarget(null); setStep(step, { state: mode, note: note || step.skipNote || "" }); }}
      />
      <AssignDialog
        target={assignTarget} onClose={() => setAssignTarget(null)}
        onConfirm={(step, email, name) => { setAssignTarget(null); setStep(step, { assignee_email: email, assignee_name: name }); }}
      />
      <RequestHelpDialog
        step={helpTarget?.step} stage={helpTarget?.stage} journey={journey}
        open={!!helpTarget} onClose={() => setHelpTarget(null)}
      />
    </div>
  );
}