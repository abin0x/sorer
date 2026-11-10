import React, { useEffect, useState } from "react";
import { Link } from '@/lib/router-compat';
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CreditCard, CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";

// Compact panel showing QuickBooks + Stripe connection status on the
// club admin / club director dashboards. Links to the full Connections page.
export default function IntegrationsPanel({ user }) {
  const [loading, setLoading] = useState(true);
  const [qbConnected, setQbConnected] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.club_id) { setLoading(false); return; }
      try {
        const [qbRes, stripeRes] = await Promise.allSettled([
          base44.functions.invoke("quickbooks-connection-status", {}),
          base44.functions.invoke("stripe-account-status", {}),
        ]);
        if (cancelled) return;
        setQbConnected(qbRes.status === "fulfilled" && qbRes.value?.data?.connected === true);
        setStripeConnected(stripeRes.status === "fulfilled" && stripeRes.value?.data?.connected === true);
      } catch {
        // ignore — panel just shows disconnected
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.club_id]);

  return (
    <Card className="border-border-subtle rounded-xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-text-primary">Integrations</h3>
          <Button variant="ghost" size="sm" asChild className="text-xs h-7">
            <Link to={"/settings/integrations"}>
              Manage <ArrowRight className="w-3 h-3 ml-1" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-50 border border-border-subtle">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary">QuickBooks</p>
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />
              ) : qbConnected ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5"><XCircle className="w-2.5 h-2.5 mr-0.5" />Not Connected</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-neutral-50 border border-border-subtle">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-text-primary">Stripe</p>
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin text-text-secondary" />
              ) : stripeConnected ? (
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px] h-5"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Connected</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] h-5"><XCircle className="w-2.5 h-2.5 mr-0.5" />Not Connected</Badge>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}