import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from '@/lib/router-compat';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, Calendar, Rocket, FileSignature, CreditCard, ClipboardList } from "lucide-react";
import BookDemoDialog from "@/components/public/BookDemoDialog";
import { JOURNEY_STAGES, stageIndex } from "@/lib/journeyStages";
import { TRIAL_CHECKLIST } from "@/lib/journeyChecklists";

export default function MyJourney() {
  const queryClient = useQueryClient();
  const [demoOpen, setDemoOpen] = useState(false);
  const [signature, setSignature] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signing, setSigning] = useState(false);
  const [paying, setPaying] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const { data: journeys, isLoading: journeyLoading } = useQuery({
    queryKey: ["myJourney", user?.email],
    queryFn: () => base44.entities.ClientJourney.filter({ contact_email: user.email }),
    enabled: !!user?.email,
  });
  const journey = journeys?.[0] || null;

  if (userLoading || journeyLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["myJourney", user.email] });

  const toggleChecklist = async (key) => {
    const next = { ...(journey.checklist_trial || {}), [key]: !journey.checklist_trial?.[key] };
    await base44.entities.ClientJourney.update(journey.id, { checklist_trial: next });
    refresh();
  };

  const signAgreement = async () => {
    if (!agreed || !signature.trim()) return;
    setSigning(true);
    try {
      await base44.entities.ClientJourney.update(journey.id, { stage: "agreement_signed", agreement_signed_date: new Date().toISOString() });
      refresh();
    } finally {
      setSigning(false);
    }
  };

  const payYear1 = async () => {
    setPaying(true);
    try {
      const res = await base44.functions.invoke("create-checkout", { productId: journey.tier_key || "standard" });
      window.location.href = res.data.redirectUrl;
    } finally {
      setPaying(false);
    }
  };

  if (!journey) {
    return (
      <div className="max-w-2xl mx-auto p-6 lg:p-10 text-center space-y-6">
        <Rocket className="w-10 h-10 text-primary mx-auto" />
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Welcome to Club Rudder</h1>
        <p className="text-slate-500 dark:text-slate-400">Book a demo or start a free trial to see your club's journey here.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button onClick={() => setDemoOpen(true)}>Book a demo</Button>
          <Button variant="outline" asChild><Link to="/ClubSignup">Start free trial</Link></Button>
        </div>
        <BookDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
      </div>
    );
  }

  const idx = stageIndex(journey.stage);
  const paid = idx >= stageIndex("paid");

  return (
    <div className="max-w-3xl mx-auto p-4 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Your journey{journey.club_name ? ` — ${journey.club_name}` : ""}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Track where you are, and what's next.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {JOURNEY_STAGES.map((s, i) => (
          <div key={s.key} className={`px-3 py-1.5 rounded-full text-xs font-semibold ${i <= idx ? "bg-primary text-primary-foreground" : "bg-slate-100 dark:bg-slate-800 text-slate-500"}`}>
            {s.label}
          </div>
        ))}
      </div>

      {(journey.stage === "lead" || journey.stage === "demo_booked" || journey.stage === "demo_held") && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Your demo</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">We'll be in touch to schedule your call. Want to skip ahead?</p>
            <Button variant="outline" asChild><Link to="/ClubSignup">Start a free trial instead</Link></Button>
          </CardContent>
        </Card>
      )}

      {journey.stage === "trial_active" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Trial checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {TRIAL_CHECKLIST.map((item) => (
              <label key={item.key} className="flex items-center gap-3 text-sm">
                <Checkbox checked={!!journey.checklist_trial?.[item.key]} onCheckedChange={() => toggleChecklist(item.key)} />
                {item.label}
              </label>
            ))}
          </CardContent>
        </Card>
      )}

      {!paid && idx >= stageIndex("trial_active") && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileSignature className="w-5 h-5 text-primary" /> Founding club agreement</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {journey.stage === "agreement_signed" ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Signed on {journey.agreement_signed_date ? new Date(journey.agreement_signed_date).toLocaleDateString() : "—"}
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-600 dark:text-slate-400">Onboarding fee waived. Confirm your tier and modules, then sign below.</p>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={agreed} onCheckedChange={setAgreed} /> I agree to the founding club terms</label>
                <div>
                  <Label>Type your full name to sign</Label>
                  <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="Jane Smith" />
                </div>
                <Button onClick={signAgreement} disabled={!agreed || !signature.trim() || signing}>
                  {signing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign agreement"}
                </Button>
              </>
            )}
            {journey.stage === "agreement_signed" && (
              <Button onClick={payYear1} disabled={paying} className="w-full">
                {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Pay Year 1</>}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {paid && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ClipboardList className="w-5 h-5 text-primary" /> Migration, setup & onboarding</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">Follow these checklists to get live.</p>
            <Button variant="outline" asChild><Link to="/JourneyChecklists">Open checklists</Link></Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}