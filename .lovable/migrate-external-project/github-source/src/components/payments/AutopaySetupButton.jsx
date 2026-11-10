import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/** Starts a Stripe setup session to save a card for autopay on a registration
 *  with an active installment plan. */
export default function AutopaySetupButton({ registrationId, enabled, hasPaymentMethod }) {
  const [loading, setLoading] = useState(false);

  if (enabled && hasPaymentMethod) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> Autopay on
      </span>
    );
  }

  const setup = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("create-setup-intent", {
        source_type: "registration",
        source_id: registrationId,
      });
      if (res.data?.url) { window.location.href = res.data.url; return; }
      toast.error("Could not start autopay setup.");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not start autopay setup.");
    }
    setLoading(false);
  };

  return (
    <Button size="sm" variant="outline" onClick={setup} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 mr-1.5" />}
      Set up autopay
    </Button>
  );
}