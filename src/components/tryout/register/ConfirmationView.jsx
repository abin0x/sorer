import React, { useEffect, useState } from "react";
import { Link } from '@/lib/router-compat';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, ClipboardList } from "lucide-react";
import { SESSION_LABEL, money, loadStatus, statusMeta, PAYMENT_STATUS, REG_STATUS } from "@/lib/tryoutRegisterApi";

/** Confirmation page — shown after the Stripe round-trip, or straight away
 *  when nothing was owed. */
export default function ConfirmationView({ clubId, groupId, result }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!groupId);

  useEffect(() => {
    if (!groupId) return;
    loadStatus({ group_id: groupId })
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [groupId]);

  const registrations = data?.registrations?.length
    ? data.registrations
    : (result?.registrations || []).map((r) => ({ ...r, plan_title: result?.plan_title || "" }));

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-5">
      <Card className="border-emerald-200">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-xl font-bold">
            {registrations.some((r) => r.status === "waitlist") ? "You're on the waitlist" : "You're registered"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            A confirmation email is on its way. Keep the check-in code below for the day.
          </p>
        </CardContent>
      </Card>

      {registrations.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold">{r.player_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.plan_title || ""}
                {r.session_date ? ` · ${r.session_date}` : ""}
                {r.session_start_time ? ` at ${r.session_start_time}` : ""}
                {r.session_field_name ? ` · ${r.session_field_name}` : ""}
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge className={statusMeta(REG_STATUS, r.status).className}>{statusMeta(REG_STATUS, r.status).label}</Badge>
                <Badge className={statusMeta(PAYMENT_STATUS, r.payment_status).className}>{statusMeta(PAYMENT_STATUS, r.payment_status).label}</Badge>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Check-in code</p>
              <p className="font-mono text-lg font-bold tracking-widest">{r.check_in_code || "—"}</p>
              {Number(r.amount_paid || 0) > 0 && <p className="text-xs text-muted-foreground">{money(r.amount_paid)} paid</p>}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <Button asChild>
          <Link to={`/TryoutStatus?club=${clubId || ""}`}><ClipboardList className="w-4 h-4 mr-2" /> View or change my registration</Link>
        </Button>
      </div>
    </div>
  );
}