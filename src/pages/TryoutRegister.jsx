import React, { useEffect, useState } from "react";
import { useSearchParams } from '@/lib/router-compat';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import PublicFooter from "@/components/public/PublicFooter";
import FamilyStep from "@/components/tryout/register/FamilyStep";
import SessionStep from "@/components/tryout/register/SessionStep";
import WaiverStep from "@/components/tryout/register/WaiverStep";
import PaymentStep from "@/components/tryout/register/PaymentStep";
import ConfirmationView from "@/components/tryout/register/ConfirmationView";
import { startCheckout } from "@/lib/tryoutRegisterApi";

const STEPS = ["Family", "Sessions", "Waivers", "Payment"];

/** Public parent tryout registration: /TryoutRegister?club=<clubId> */
export default function TryoutRegister() {
  const [params] = useSearchParams();
  const clubId = params.get("club") || "";
  const presetEvent = params.get("id") || "";
  const groupId = params.get("step") === "confirmation" ? params.get("group") : "";
  const canceled = params.get("canceled") === "1";

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState(params.get("email") || "");
  const [guardian, setGuardian] = useState({
    first_name: "", last_name: "", phone: "", street_address: "", city: "", state: "", zip_code: "",
  });
  const [family, setFamily] = useState(null);
  const [selected, setSelected] = useState([]);
  const [choices, setChoices] = useState({});
  const [promo, setPromo] = useState(null);
  const [aid, setAid] = useState(false);
  const [aidNote, setAidNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { if (canceled) toast.info("Payment was cancelled — nothing was charged."); }, [canceled]);

  const planById = {};
  (family?.plans || []).forEach((p) => { planById[p.id] = p; });

  const toggleChild = (kid) => {
    setSelected((prev) => {
      if (prev.some((s) => s.id === kid.id)) {
        setChoices((c) => { const next = { ...c }; delete next[kid.id]; return next; });
        return prev.filter((s) => s.id !== kid.id);
      }
      const eligible = (kid.eligibility || []).find((e) => e.eligible);
      const plan = eligible ? (family?.plans || []).find((p) => p.id === eligible.plan_id) : null;
      if (plan?.sessions?.length) {
        const first = presetEvent && plan.sessions.some((s) => s.id === presetEvent) ? presetEvent : plan.sessions[0].id;
        setChoices((c) => ({ ...c, [kid.id]: { plan_id: plan.id, event_id: first, accepted: [], signature: "" } }));
      }
      return [...prev, kid];
    });
  };

  const choose = (kidId, planId, eventId) => setChoices((c) => ({
    ...c, [kidId]: { ...(c[kidId] || {}), plan_id: planId, event_id: eventId },
  }));
  const setChoice = (kidId, patch) => setChoices((c) => ({
    ...c, [kidId]: { ...(c[kidId] || {}), ...patch },
  }));

  const valid = (upTo = 3) => {
    if (!selected.length) { toast.error("Pick at least one player."); return false; }
    const noSession = selected.filter((k) => !choices[k.id]?.event_id);
    if (upTo >= 1 && noSession.length) { toast.error(`Choose a session for ${noSession.map((k) => k.first_name).join(", ")}.`); return false; }
    if (upTo < 2) return true;
    for (const k of selected) {
      const choice = choices[k.id] || {};
      const required = (planById[choice.plan_id]?.required_documents || []).filter((d) => d.required !== false);
      const missing = required.filter((d) => !(choice.accepted || []).includes(d.name));
      if (missing.length) { toast.error(`${k.first_name}: accept "${missing[0].name}" to continue.`); return false; }
      if (!choice.signature?.trim()) { toast.error(`Type a signature for ${k.first_name}.`); return false; }
    }
    return true;
  };

  const next = () => { if (valid(step)) setStep((s) => s + 1); };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const submit = async () => {
    if (!valid()) return;
    setSubmitting(true);
    try {
      const items = selected.map((k) => ({
        plan_id: choices[k.id].plan_id,
        event_id: choices[k.id].event_id,
        player_id: k.id,
        waiver: { signature: choices[k.id].signature, accepted_documents: choices[k.id].accepted || [] },
      }));
      const res = await startCheckout({
        club_id: clubId,
        guardian: { ...guardian, email: email.trim() },
        items,
        promo_code: promo?.code || "",
        financial_aid: aid,
        financial_aid_note: aidNote,
        utm_source: params.get("utm_source") || "",
        utm_campaign: params.get("utm_campaign") || "",
      });
      if (res.checkout_url) { window.location.href = res.checkout_url; return; }
      setResult({ ...res, plan_title: planById[items[0].plan_id]?.title || "" });
      setStep(4);
      window.scrollTo(0, 0);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children) => (
    <div className="safe-top min-h-screen bg-background text-foreground">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Trophy className="w-5 h-5" /></div>
            <span className="font-bold">{family?.club?.name ? `${family.club.name} Tryouts` : "Tryout Registration"}</span>
          </div>
          <h1 className="text-3xl font-bold">Register for tryouts</h1>
          <p className="mt-2 opacity-90 text-sm">
            Pick your player's session, sign the waivers and pay in one step. Siblings can be paid together.
          </p>
        </div>
      </div>
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">{children}</div>
      <PublicFooter />
    </div>
  );

  if (!clubId) {
    return shell(
      <Card><CardContent className="p-8 text-center">
        <p className="font-semibold">This link is missing a club.</p>
        <p className="text-sm text-muted-foreground mt-2">Ask your club for its tryout registration link.</p>
      </CardContent></Card>,
    );
  }

  if (groupId || result) {
    return shell(<ConfirmationView clubId={clubId} groupId={groupId} result={result} />);
  }

  return shell(
    <>
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/15 text-primary border border-primary" : "bg-muted text-muted-foreground"}`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{label}</span>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? "bg-primary" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <FamilyStep
          clubId={clubId} email={email} setEmail={setEmail} guardian={guardian} setGuardian={setGuardian}
          family={family} setFamily={setFamily} selected={selected} toggleChild={toggleChild} onContinue={next}
        />
      )}
      {step === 1 && <SessionStep family={family} selected={selected} choices={choices} choose={choose} />}
      {step === 2 && (
        <WaiverStep
          family={family} selected={selected} choices={choices} setChoice={setChoice}
          guardianName={`${guardian.first_name} ${guardian.last_name}`.trim()}
        />
      )}
      {step === 3 && (
        <PaymentStep
          clubId={clubId} family={family} selected={selected} choices={choices}
          promo={promo} setPromo={setPromo} aid={aid} setAid={setAid} aidNote={aidNote} setAidNote={setAidNote}
          submitting={submitting} onSubmit={submit}
          refundPolicy={[...new Set(selected.map((k) => planById[choices[k.id]?.plan_id]?.refund_policy).filter(Boolean))].join(" ")}
        />
      )}

      {step > 0 && step < 3 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={back}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
          <Button onClick={next}>Continue</Button>
        </div>
      )}
      {step === 3 && (
        <Button variant="ghost" onClick={back} className="mx-auto"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
      )}
    </>,
  );
}