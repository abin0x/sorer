import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckCircle2, Trophy, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import PublicFooter from "@/components/public/PublicFooter";
import ResponsiveSelect from "@/components/shared/ResponsiveSelect";

/**
 * Public final-registration portal — reached from the invite email. No login
 * required: reads/writes go through backend functions using the service role
 * so an anonymous guardian can complete the waiver + payment step.
 */
export default function FinalRegistration() {
  const [searchParams] = useSearchParams();
  const inviteId = searchParams.get("invite");
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [team, setTeam] = useState(null);
  const [error, setError] = useState("");
  const [waiverAccepted, setWaiverAccepted] = useState(false);
  const [paymentFrequency, setPaymentFrequency] = useState("one_time");
  const [installmentCount, setInstallmentCount] = useState(3);
  const [autopay, setAutopay] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!inviteId) { setLoading(false); setError("Missing invite link."); return; }
    base44.functions.invoke("getFinalRegistrationInvite", { inviteId })
      .then((res) => {
        setInvite(res.data.invite);
        setTeam(res.data.team);
      })
      .catch(() => setError("This registration invite could not be found."))
      .finally(() => setLoading(false));
  }, [inviteId]);

  const handleSubmit = async () => {
    if (!waiverAccepted) {
      toast.error("Please accept the waiver to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const plan = paymentFrequency === "installments"
        ? {
            installment_count: Number(installmentCount),
            installment_amount: Math.round((invite.amount_due / Number(installmentCount)) * 100) / 100,
            installments_paid: 0,
            next_installment_date: new Date().toISOString().split("T")[0],
            autopay_enabled: autopay,
          }
        : {};
      await base44.functions.invoke("submitFinalRegistration", {
        inviteId,
        waiver_accepted: true,
        payment_frequency: paymentFrequency,
        ...plan,
      });
      // Installment + autopay: send to a Stripe setup session to save the card.
      if (invite.amount_due > 0 && paymentFrequency === "installments" && autopay) {
        try {
          const res = await base44.functions.invoke("create-setup-intent", {
            source_type: "tryout_final_registration",
            source_id: inviteId,
          });
          if (res.data?.url) { window.location.href = res.data.url; return; }
        } catch (e) {
          toast.error("Could not set up autopay — you can still complete registration and pay manually.");
        }
      }
      // Pay-in-full: go straight to checkout.
      if (invite.amount_due > 0 && paymentFrequency === "one_time") {
        try {
          const res = await base44.functions.invoke("create-club-checkout", {
            source_type: "tryout_final_registration",
            source_id: inviteId,
          });
          if (res.data?.url) { window.location.href = res.data.url; return; }
        } catch (e) {
          toast.error("Could not start payment — the club will follow up with payment instructions.");
        }
      }
      setInvite((prev) => ({ ...prev, status: "submitted", waiver_accepted: true, payment_frequency: paymentFrequency, ...plan }));
      toast.success("Registration submitted!");
    } catch (e) {
      toast.error("Failed to submit. Please try again.");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-semibold text-slate-700">Invite not found</p>
            <p className="text-sm text-slate-500 mt-2">{error || "This link may be invalid or expired."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const submitted = invite.status === "submitted" || invite.status === "paid";

  return (
    <div className="safe-top min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 text-white">
        <div className="max-w-2xl mx-auto px-6 py-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg">Final Registration</span>
          </div>
          <h1 className="text-3xl font-bold mb-1">{invite.player_name}</h1>
          <p className="text-emerald-100">Team assignment: <strong>{invite.team_name}</strong></p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {submitted ? (
          <Card className="border-emerald-200 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Registration Complete!</h2>
              <p className="text-slate-600">
                Thanks for completing {invite.player_name}'s registration for {invite.team_name}.
                {invite.status === "paid"
                  ? ` Your payment of $${invite.amount_due.toLocaleString()} has been received.`
                  : invite.amount_due
                  ? ` The club will follow up with instructions to complete your ${invite.payment_frequency === "installments" ? "installment plan" : "payment"} of $${invite.amount_due.toLocaleString()}.`
                  : ""}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-md border-slate-200">
            <CardContent className="p-6 space-y-6">
              <div>
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" /> Waiver & Registration
                </h2>
                <p className="text-sm text-slate-500">Review and accept to secure {invite.player_name}'s spot on {invite.team_name}.</p>
              </div>

              {invite.amount_due > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Registration Fee: ${invite.amount_due.toLocaleString()}</p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={paymentFrequency === "one_time" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentFrequency("one_time")}
                    >
                      Pay in Full
                    </Button>
                    <Button
                      type="button"
                      variant={paymentFrequency === "installments" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPaymentFrequency("installments")}
                    >
                      Installment Plan
                    </Button>
                  </div>
                  {paymentFrequency === "installments" && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600">Pay in</span>
                        <ResponsiveSelect
                          className="h-8 text-xs px-2"
                          value={String(installmentCount)}
                          onChange={(v) => setInstallmentCount(Number(v))}
                          label="Number of payments"
                          options={[2, 3, 4, 6, 8, 10, 12].map((n) => ({ value: String(n), label: `${n} payments` }))}
                        />
                        <span className="text-xs text-slate-600">of ${(invite.amount_due / installmentCount).toFixed(2)}/mo</span>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-slate-700">
                        <input type="checkbox" checked={autopay} onChange={(e) => setAutopay(e.target.checked)} />
                        Enable autopay — charge my saved card automatically each month
                      </label>
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    {paymentFrequency === "installments" && autopay
                      ? "You'll save a card now and be charged automatically on each due date."
                      : "The club will follow up with secure payment instructions for your chosen plan."}
                  </p>
                </div>
              )}

              <div className="flex items-start gap-3 border border-slate-200 rounded-xl p-4">
                <Checkbox checked={waiverAccepted} onCheckedChange={setWaiverAccepted} className="mt-0.5" />
                <p className="text-sm text-slate-700">
                  I acknowledge the club's liability waiver and medical release, and confirm the information
                  provided during tryouts for {invite.player_name} is accurate.
                </p>
              </div>

              <Button onClick={handleSubmit} disabled={submitting || !waiverAccepted} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {invite.amount_due > 0 && paymentFrequency === "one_time" ? "Redirecting to payment…" : "Submitting…"}</>
                ) : invite.amount_due > 0 && paymentFrequency === "one_time" ? (
                  "Continue to Payment"
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <PublicFooter />
    </div>
  );
}