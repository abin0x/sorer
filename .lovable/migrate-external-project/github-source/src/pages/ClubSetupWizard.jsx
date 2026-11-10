import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ShieldAlert } from "lucide-react";
import WizardProgressBar from "@/components/wizard/WizardProgressBar";
import StepIdentity from "@/components/wizard/StepIdentity";
import StepStructure from "@/components/wizard/StepStructure";
import StepModules from "@/components/wizard/StepModules";
import StepMigrationHandoff from "@/components/wizard/StepMigrationHandoff";

export default function ClubSetupWizard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [club, setClub] = useState(null);
  const [progress, setProgress] = useState(null);
  const [step, setStep] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me();
      if (!user?.club_id) { setLoading(false); return; }
      const [clubData, progressRows] = await Promise.all([
        base44.entities.Club.get(user.club_id),
        base44.entities.ClubSetupProgress.filter({ club_id: user.club_id }),
      ]);
      setClub(clubData);
      let prog = progressRows[0];
      if (!prog) prog = await base44.entities.ClubSetupProgress.create({ club_id: user.club_id });
      setProgress(prog);
      // A club that already has teams or players has effectively completed setup —
      // don't trap them in the wizard. Stamp it complete and send them home.
      const [teamsCheck, playersCheck] = await Promise.all([
        base44.entities.Team.filter({ club_id: user.club_id }, "-created_date", 1).catch(() => []),
        base44.entities.Player.filter({ club_id: user.club_id }, "-created_date", 1).catch(() => []),
      ]);
      const hasData = teamsCheck.length > 0 || playersCheck.length > 0;
      if (hasData || prog.wizard_completed_at) {
        if (!prog.wizard_completed_at) {
          await base44.entities.ClubSetupProgress.update(prog.id, { wizard_completed_at: new Date().toISOString() });
        }
        navigate("/home");
        return;
      }
      const nextStep = !prog.step_1_complete ? 1 : !prog.step_2_complete ? 2 : !prog.step_3_complete ? 3 : 4;
      setStep(nextStep);
    } catch (e) {
      toast({ title: "Failed to load", description: e?.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markStep = async (fields) => {
    const updated = await base44.entities.ClubSetupProgress.update(progress.id, fields);
    setProgress(updated);
    return updated;
  };

  const finishWizard = async (to = "/home") => {
    await markStep({ step_4_complete: true, wizard_completed_at: new Date().toISOString() });
    toast({ title: "Setup complete!", description: to === "/MigrationWizard" ? "Let's migrate your data." : "Welcome to your Club Rudder dashboard." });
    navigate(to);
  };

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!club) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="font-bold text-lg">No Club Assigned</h2>
        <p className="text-sm text-slate-500">Your account isn't linked to a club yet.</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-extrabold text-slate-900">Set Up {club.name}</h1>
        <p className="text-slate-500 text-sm">Four quick steps and you're ready to go.</p>
      </div>

      <WizardProgressBar currentStep={step} />

      <Card>
        <CardContent className="p-6">
          {step === 1 && (
            <StepIdentity
              club={club}
              onSaved={async () => { setClub({ ...club }); await markStep({ step_1_complete: true }); setStep(2); }}
            />
          )}
          {step === 2 && (
            <StepStructure
              club={club}
              onBack={() => setStep(1)}
              onSaved={async () => { await markStep({ step_2_complete: true }); setStep(3); }}
            />
          )}
          {step === 3 && (
            <StepModules
              club={club}
              onBack={() => setStep(2)}
              onSaved={async () => { await markStep({ step_3_complete: true }); setStep(4); }}
            />
          )}
          {step === 4 && (
            <StepMigrationHandoff
              club={club}
              onBack={() => setStep(3)}
              onSkip={async () => { await markStep({ migration_skipped: true }); await finishWizard(); }}
              onStartMigration={async () => { await finishWizard("/MigrationWizard"); }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}