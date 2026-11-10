import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2 } from "lucide-react";

export default function ThankYou() {
  const [status, setStatus] = useState("confirming"); // confirming | active | error
  const [club, setClub] = useState(null);

  useEffect(() => {
    let attempts = 0;
    const poll = async () => {
      attempts++;
      try {
        const me = await base44.auth.me().catch(() => null);
        if (!me?.club_id) {
          if (attempts < 10) { setTimeout(poll, 2000); return; }
          setStatus("active"); return;
        }
        const c = await base44.entities.Club.get(me.club_id);
        setClub(c);
        if (c?.subscription_status === "active") { setStatus("active"); return; }
        if (attempts < 12) { setTimeout(poll, 2500); }
        else { setStatus("active"); }
      } catch {
        if (attempts < 12) { setTimeout(poll, 2500); }
        else { setStatus("error"); }
      }
    };
    poll();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {status === "confirming" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-emerald-600 animate-spin mb-4" />
            <h1 className="text-xl font-bold text-slate-900">Confirming your payment…</h1>
            <p className="text-slate-500 mt-2 text-sm">
              Your subscription is activating. This usually takes a few seconds.
            </p>
          </>
        )}
        {status === "active" && (
          <>
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-4" />
            <h1 className="text-xl font-bold text-slate-900">You're all set!</h1>
            <p className="text-slate-500 mt-2 text-sm">
              {club ? `${club.name} is now on the ${club.plan_tier} plan.` : "Your subscription is active."}
            </p>
            <Link
              to="/"
              className="inline-flex mt-6 px-6 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700"
            >
              Go to Dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-slate-900">Payment is being processed</h1>
            <p className="text-slate-500 mt-2 text-sm">
              We couldn't confirm instantly. If you were charged, your subscription will activate shortly.
            </p>
            <Link to="/" className="inline-flex mt-6 px-6 py-2.5 rounded-lg border border-slate-300 font-semibold hover:bg-slate-50">
              Go to Dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}