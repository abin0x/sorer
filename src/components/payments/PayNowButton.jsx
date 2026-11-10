import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Loader2, CreditCard } from "lucide-react";
import { toast } from "sonner";

/** Redirects to a Stripe Checkout session for the given Registration's outstanding balance. */
export default function PayNowButton({ registrationId, className = "" }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("create-club-checkout", {
        source_type: "registration",
        source_id: registrationId,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
        return;
      }
      toast.error("Could not start payment.");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Could not start payment.");
    }
    setLoading(false);
  };

  return (
    <Button
      size="sm"
      onClick={handlePay}
      disabled={loading}
      className={`rounded-xl shadow-sm ${className}`}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <CreditCard className="w-3.5 h-3.5 mr-1.5" />}
      Pay Now
    </Button>
  );
}